// server/controllers/acteController.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Créer une demande d'acte de naissance
async function créerDemandeActe(req, res) {
    const { nom, prenom, sexe, dateNaissance, lieuNaissance, commune, nomPere, nomMere, citoyenId } = req.body;

    try {
        // 1. Insertion dans la base PostgreSQL
        const { data: acte, error } = await supabase
            .from('actes_etat_civil')
            .insert([
                {
                    nom,
                    prenom,
                    sexe,
                    date_naissance: dateNaissance,
                    lieu_naissance: lieuNaissance,
                    commune,
                    nom_pere: nomPere,
                    nom_mere: nomMere,
                    citoyen_id: citoyenId,
                    statut: 'EN_ATTENTE_PAIEMENT'
                }
            ])
            .select()
            .single();

        if (error) throw error;

        // 2. Enregistrer l'action dans les journaux d'audit (Anti-Corruption)
        await supabase.from('audit_logs').insert([
            {
                user_id: citoyenId,
                action: 'DEMANDE_ACTE_CREEE',
                details: `Acte N° ${acte.numero_registre} créé pour ${nom} ${prenom}`,
                adresse_ip: req.ip
            }
        ]);

        return res.status(201).json({
            succes: true,
            message: "Acte créé. En attente de paiement de la taxe.",
            acte
        });

    } catch (err) {
        return res.status(500).json({ succes: false, erreur: err.message });
    }
}

module.exports = { créerDemandeActe };
// server/controllers/paymentController.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Étape A : Initier le paiement Mobile Money
 */
async function initierPaiementTaxe(req, res) {
    const { acteId, citoyenId, montant, operateur, telephonePayeur } = req.body;

    try {
        // 1. Générer une référence de transaction unique
        const referenceTx = 'TX-GOV-' + Math.floor(100000 + Math.random() * 900000);

        // 2. Enregistrer la transaction en attente dans PostgreSQL
        const { data: transaction, error } = await supabase
            .from('transactions_taxes')
            .insert([
                {
                    reference_transaction: referenceTx,
                    acte_id: acteId,
                    citoyen_id: citoyenId,
                    montant: montant,
                    devise: 'CDF',
                    mode: 'MOBILE_MONEY',
                    operateur: operateur, // 'MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY'
                    num_telephone_payeur: telephonePayeur,
                    statut: 'EN_ATTENTE'
                }
            ])
            .select()
            .single();

        if (error) throw error;

        // 3. Simuler l'appel à l'API de l'opérateur Mobile Money (USSD Push / Prompt sur le téléphone)
        // (En production, ici vous appellerez l'API officielle Vodacom M-Pesa, Orange API, etc.)
        console.log(`[USSD PUSH] Demande de paiement envoyée au ${telephonePayeur} pour un montant de ${montant} CDF`);

        return res.status(200).json({
            succes: true,
            message: "Demande de paiement envoyée sur le mobile du citoyen. Veuillez valider avec votre code PIN.",
            reference_transaction: referenceTx
        });

    } catch (err) {
        return res.status(500).json({ succes: false, erreur: err.message });
    }
}

/**
 * Étape B : Webhook de l'Opérateur (Reçoit la confirmation de paiement)
 */
async function webhookMobileMoney(req, res) {
    const { reference_transaction, statut_operateur } = req.body; // 'SUCCESS' ou 'FAILED'

    try {
        if (statut_operateur === 'SUCCESS') {
            // 1. Mettre à jour la transaction comme réussie
            const { data: tx, error: errTx } = await supabase
                .from('transactions_taxes')
                .update({ statut: 'REUSSI', date_paiement: new Date() })
                .eq('reference_transaction', reference_transaction)
                .select()
                .single();

            if (errTx) throw errTx;

            // 2. Activer automatiquement l'Acte d'État Civil correspondant
            const { error: errActe } = await supabase
                .from('actes_etat_civil')
                .update({ statut: 'VALIDE' })
                .eq('id', tx.acte_id);

            if (errActe) throw errActe;

            // 3. Enregistrer l'action dans les Audit Logs (Anti-Corruption)
            await supabase.from('audit_logs').insert([
                {
                    user_id: tx.citoyen_id,
                    action: 'TAXE_PAYEE_ET_ACTE_VALIDE',
                    details: `Taxe acquittée pour la transaction ${reference_transaction}. Acte débloqué.`
                }
            ]);

            return res.status(200).json({ status: 'received', message: 'Paiement validé et acte activé avec succès.' });
        } else {
            // Marquer la transaction comme échouée
            await supabase
                .from('transactions_taxes')
                .update({ statut: 'ECHOUE' })
                .eq('reference_transaction', reference_transaction);

            return res.status(400).json({ status: 'failed', message: 'Le paiement a échoué ou a été annulé.' });
        }

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

module.exports = { initierPaiementTaxe, webhookMobileMoney };