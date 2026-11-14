// --- Initialisation unique de Supabase ---
const SUPABASE_URL = 'https://iofrjpaadsmdxsngdllc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Tx1YT7durqPkFh1qnLPujQ_s4zT2L5q';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable globale pour stocker l'opérateur Mobile Money sélectionné
let selectedMobileOperator = 'M-Pesa';

// --- Gestion universelle et dynamique de la sélection de l'opérateur ---
function selectOperator(operator) {
    selectedMobileOperator = operator;
    
    // Sélectionne tous les boutons de la zone mobile money
    const buttons = document.querySelectorAll('#paymentMobileSection button');
    
    buttons.forEach(btn => {
        const text = btn.textContent.trim();
        
        if (text.includes(operator)) {
            // Style actif (sélectionné)
            btn.classList.add('border-emerald-500', 'bg-slate-900', 'text-white');
            btn.classList.remove('border-slate-800', 'bg-slate-950', 'text-slate-400');
        } else if (text.includes('M-Pesa') || text.includes('Orange') || text.includes('Airtel')) {
            // Style inactif pour les autres
            btn.classList.remove('border-emerald-500', 'bg-slate-900', 'text-white');
            btn.classList.add('border-slate-800', 'bg-slate-950', 'text-slate-400');
        }
    });
}

// --- 1. Gestion de l'affichage dynamique des champs selon le type de document ---
function toggleDocumentFields() {
    const docType = document.getElementById('docTypeSelect')?.value;
    const fieldsNaissance = document.getElementById('fieldsNaissance');
    const fieldsMoeurs = document.getElementById('fieldsMoeurs');
    const fieldsVisa = document.getElementById('fieldsVisa');

    if (fieldsNaissance) fieldsNaissance.classList.add('hidden');
    if (fieldsMoeurs) fieldsMoeurs.classList.add('hidden');
    if (fieldsVisa) fieldsVisa.classList.add('hidden');

    if (docType === 'Acte de Naissance') {
        if (fieldsNaissance) fieldsNaissance.classList.remove('hidden');
    } else if (docType === 'Certificat de Bonne Vie et Moeurs') {
        if (fieldsMoeurs) fieldsMoeurs.classList.remove('hidden');
    } else if (docType === "Visa d'Entrée / Voyage") {
        if (fieldsVisa) fieldsVisa.classList.remove('hidden');
    }
}

// --- 2. Gestion des onglets de paiement (Mobile Money vs Carte) ---
function switchPaymentMethod(method) {
    const mobileSection = document.getElementById('paymentMobileSection');
    const cardSection = document.getElementById('paymentCardSection');
    const tabMobile = document.getElementById('tab-mobile');
    const tabCard = document.getElementById('tab-card');

    if (method === 'mobile') {
        if (mobileSection) mobileSection.classList.remove('hidden');
        if (cardSection) cardSection.classList.add('hidden');
        if (tabMobile) {
            tabMobile.classList.add('border-emerald-500', 'bg-slate-900', 'text-white');
            tabMobile.classList.remove('border-slate-800', 'bg-slate-950', 'text-slate-400');
        }
        if (tabCard) {
            tabCard.classList.remove('border-emerald-500', 'bg-slate-900', 'text-white');
            tabCard.classList.add('border-slate-800', 'bg-slate-950', 'text-slate-400');
        }
    } else if (method === 'card') {
        if (cardSection) cardSection.classList.remove('hidden');
        if (mobileSection) mobileSection.classList.add('hidden');
        if (tabCard) {
            tabCard.classList.add('border-emerald-500', 'bg-slate-900', 'text-white');
            tabCard.classList.remove('border-slate-800', 'bg-slate-950', 'text-slate-400');
        }
        if (tabMobile) {
            tabMobile.classList.remove('border-emerald-500', 'bg-slate-900', 'text-white');
            tabMobile.classList.add('border-slate-800', 'bg-slate-950', 'text-slate-400');
        }
    }
}

// --- 3. Gestion de la soumission du formulaire et génération du QR Code ---
// Variable globale pour stocker le mode de paiement par défaut
window.selectedOperator = 'M-Pesa';

// Fonction pour adapter la structure du champ selon le mode choisi
function setPaymentMode(mode) {
    window.selectedOperator = mode;
    const container = document.getElementById('dynamicPaymentFields');
    if (!container) return;

    if (mode === 'Carte Bancaire') {
        // Structure spécifique pour la Carte Bancaire (Nom + Numéro de carte)
        container.innerHTML = `
            <div class="space-y-3 pt-2">
                <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Nom sur la Carte Bancaire</label>
                    <input type="text" id="nomCarteInput" placeholder="Nom du titulaire..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Numéro Bancaire / Carte</label>
                    <input type="text" id="numeroBancaireInput" placeholder="XXXX XXXX XXXX XXXX" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white">
                </div>
            </div>
        `;
    } else {
        // Structure standard pour Mobile Money (M-Pesa, Orange Money, Airtel Money)
        container.innerHTML = `
            <div class="space-y-3 pt-2">
                <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Opérateur de Paiement</label>
                    <input type="text" id="numeroPaiementInput" placeholder="+243..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white">
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnValider = document.getElementById('btnValider');
    if (!btnValider) return;

    btnValider.addEventListener('click', async () => {
        try {
            // 1. Génération de la référence unique
            const referenceId = 'REF-' + Date.now();

            // 2. Récupération des valeurs du formulaire
            const docType = document.getElementById('typeDocInput')?.value || 'Acte de Naissance';
            const nom = document.getElementById('nomInput')?.value || '';
            const postnom = document.getElementById('postnomInput')?.value || '';
            const prenom = document.getElementById('prenomInput')?.value || '';
            const secteur = document.getElementById('secteurInput')?.value || '';
            const province = document.getElementById('provinceInput')?.value || '';
            const adresseresidentielle = document.getElementById('adresseresidentielleInput')?.value || document.getElementById('adresseInput')?.value || '';
            
            const emailVal = document.getElementById('emailInput')?.value || '';
            const dateNaisVal = document.getElementById('dateNaissanceInput')?.value || null;
            
            // 3. Traitement de l'opérateur et des informations de paiement selon le mode choisi
            const operatorType = window.selectedOperator || 'Mobile Money';
            let operateurFinal = '';

            if (operatorType === 'Carte Bancaire') {
                const nomCarte = document.getElementById('nomCarteInput')?.value || '';
                const numCarte = document.getElementById('numeroBancaireInput')?.value || '';
                operateurFinal = `Carte Bancaire (Nom: ${nomCarte}, N°: ${numCarte})`;
            } else {
                const numeroSaisi = document.getElementById('numeroPaiementInput')?.value || '';
                operateurFinal = numeroSaisi ? `${operatorType} (${numeroSaisi})` : operatorType;
            }

            // 4. Insertion dans la base de données Supabase
            const { data, error } = await supabaseClient
                .from('documents')
                .insert([
                    {
                        reference: referenceId,
                        type_document: docType,
                        nom: nom,
                        postnom: postnom,
                        prenom: prenom,
                        secteur: secteur,
                        province: province,
                        adresseresidentielle: adresseresidentielle, // Correspond à ta colonne Supabase
                        email: emailVal,                            // Correspond à la colonne email
                        operateur_paiement: operateurFinal,         // Enregistre les détails du paiement
                        "Date de naissance": dateNaisVal,           // Correspond au nom exact de la colonne avec espaces
                        statut: 'OFFICIAL_VALID'
                    }
                ]);

            if (error) throw error;

            // 5. Génération du QR Code
            const qrcodeContainer = document.getElementById('qrcode');
            if (qrcodeContainer) {
                qrcodeContainer.innerHTML = "";
                const verificationUrl = `https://guichet-national.github.io/guichet-national/verification.html?ref=${referenceId}`
                
                new QRCode(qrcodeContainer, {
                    text: verificationUrl,
                    width: 128,
                    height: 128
                });
            }

            alert("Document enregistré et QR Code généré avec succès !");

        } catch (error) {
            console.error("Erreur lors de l'enregistrement :", error);
            alert("Erreur lors de l'enregistrement : " + error.message);
        }
    });
});