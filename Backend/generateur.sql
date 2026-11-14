create table documents (
    id uuid default gen_random_uuid() primary key,
    reference varchar(50) unique not null,
    nom varchar(100) not null,
    postnom varchar(100) not null,
    prenom varchar(100) not null,
    email varchar(150) not null,
    type_document varchar(100) not null,
    secteur varchar(100) not null,
    province_provenance varchar(100) not null,
    adresse_residentielle text not null,
    details_specifiques jsonb, -- Pour stocker les données propres à chaque document
    statut varchar(50) default 'OFFICIAL_VALID',
    date_emission timestamp with time zone default timezone('utc'::text, now()) not null
    alter table documents add column if not exists territoire varchar(100);
);

create index idx_documents_reference on documents(reference);