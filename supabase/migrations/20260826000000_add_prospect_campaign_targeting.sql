-- Non-destructive targeting for the verified school campaign north of Calle 153.
-- Existing prospects stay in their master list. New schools are inserted only when absent.

alter table public.prospects
add column if not exists campaign text;

create index if not exists prospects_campaign_idx
on public.prospects (campaign)
where campaign is not null;

with target_data (
  company_name,
  address,
  phone,
  website,
  priority,
  public_email,
  contact_role,
  source_url,
  is_new
) as (
  values
    ('COLEGIO CALATRAVA', 'Tv. 88 #157-85, Bogota D.C.', '3176426972', 'https://colegiocalatrava.edu.co/', 'A', 'admisiones@colegiocalatrava.edu.co', 'Contacto institucional', 'https://colegiocalatrava.edu.co/', false),
    ('GIMNASIO CAMPESTRE', 'Calle 165 #8A-50, Bogota D.C.', '6016684400', 'https://campestre.co/', 'A', 'gimnasio@campestre.co', 'Contacto institucional', 'https://campestre.co/', false),
    ('GIMNASIO CAMPESTRE ESCALEMOS', 'Cra. 56 #167C-56, Bogota D.C.', '3116280075', null, 'B', 'gc_escalemos@yahoo.es', 'Contacto institucional', null, false),
    ('COLEGIO DE INGLATERRA (THE ENGLISH SCHOOL)', 'Calle 170 #15-68, Bogota D.C.', '6016767700', 'https://englishschool.edu.co/', 'A', 'contactenos@englishschool.edu.co', 'Contacto institucional', 'https://englishschool.edu.co/', false),
    ('COLEGIO BILINGÜE ABRAHAM LINCOLN', 'Av. Calle 170 #65-31, Bogota D.C.', '6017423166', 'https://als.edu.co/', 'A', null, 'Contacto institucional', 'https://als.edu.co/', false),
    ('GIMNASIO JOSE JOAQUIN CASAS - BILINGÜE NACIONAL', 'Av. Cra. 7 #173-02, Bogota D.C.', '3166480776', 'https://gimnasiojjcasas.edu.co/', 'B', 'admisiones@gimnasiojjcasas.edu.co', 'Contacto institucional', 'https://gimnasiojjcasas.edu.co/', false),
    ('GIMNASIO CAMPESTRE STEPHEN HAWKING', 'Cra. 68 #173A-50, Bogota D.C.', '3124827804', null, 'B', null, 'Contacto institucional', null, false),
    ('COLEGIO SANTA MARIA', 'Cra. 11 #185B-17, Bogota D.C.', '6016714440', 'https://csm.edu.co/', 'A', 'contactenos@csm.edu.co', 'Contacto institucional', 'https://csm.edu.co/', false),
    ('COLEGIO GEORGE WASHINGTON SCHOOL', 'Cra. 8C #185A-24, Bogota D.C.', '6019197700', 'https://georgewashington.edu.co/', 'B', null, 'Contacto institucional', 'https://georgewashington.edu.co/', false),
    ('COLEGIO SAN CARLOS', 'Calle 192 #14-45, Bogota D.C.', '6015929000', 'https://sancarlos.edu.co/', 'A', 'administracion@sancarlos.edu.co', 'Administracion', 'https://sancarlos.edu.co/', false),
    ('GIMNASIO VERMONT', 'Calle 195 #54-75, Bogota D.C.', '6015185757', 'https://gimnasiovermont.edu.co/', 'A', null, 'Contacto institucional', 'https://gimnasiovermont.edu.co/', false),
    ('COLEGIO LOS NOGALES', 'Calle 202 #56-50, Bogota D.C.', '6019162880', 'https://www.nogales.edu.co/', 'A', 'cln@nogales.edu.co', 'Contacto institucional', 'https://www.nogales.edu.co/', false),
    ('COLEGIO SAN VIATOR BILINGÜE INTERNACIONAL', 'Autopista Norte #209-51, Bogota D.C.', '3174324990', 'https://sanviator.edu.co/', 'A', null, 'Contacto institucional', 'https://sanviator.edu.co/', false),
    ('GIMNASIO LOS PORTALES COLEGIO BILINGÜE', 'Calle 212 #77-20, Bogota D.C.', '3124335325', 'https://losportales.edu.co/', 'A', 'contacto@losportales.edu.co', 'Contacto institucional', 'https://losportales.edu.co/', false),
    ('COLEGIO BILINGÜE CLERMONT', 'Tv. 80 #213A-17, Bogota D.C.', '3124059410', 'https://clermont.edu.co/', 'A', 'info@clermont.edu.co', 'Contacto institucional', 'https://clermont.edu.co/', false),
    ('COLEGIO BILINGÜE BUCKINGHAM', 'Cra. 52 #214-55, Bogota D.C.', '6019172136', 'https://cbk.edu.co/', 'A', 'info@cbk.edu.co', 'Contacto institucional', 'https://cbk.edu.co/', false),
    ('GIMNASIO LA MONTAÑA', 'Cra. 51 #214-55, Bogota D.C.', '6016761861', null, 'A', null, 'Contacto institucional', null, false),
    ('COLEGIO GRAN BRETAÑA', 'Cra. 51 #215-20, Bogota D.C.', '3158873788', 'https://cgb.edu.co/', 'A', 'admissions@cgb.edu.co', 'Contacto institucional', 'https://cgb.edu.co/', false),
    ('COLEGIO SAN MATEO APOSTOL BILINGÜE INTERNACIONAL', 'Calle 215 #50-24, Bogota D.C.', '6016760885', 'https://csma.edu.co/', 'A', 'info@csma.edu.co', 'Contacto institucional', 'https://csma.edu.co/', false),
    ('COLEGIO ANDINO', 'Cra. 51 #218-85, Bogota D.C.', '6016684250', 'https://www.colegioandino.edu.co/', 'A', null, 'Cafeteria / proveedores', 'https://www.colegioandino.edu.co/contacto', false),
    ('GIMNASIO FONTANA', 'Calle 221 #108-20, Bogota D.C.', '6017420303', 'https://gimnasiofontana.edu.co/', 'A', null, 'Cafeteria / contacto institucional', 'https://gimnasiofontana.edu.co/', false),
    ('COLEGIO BILINGÜE RICHMOND', 'Cra. 53 #222-76, Bogota D.C.', '6016763864', 'https://cbr.edu.co/', 'A', 'desarrolloinstitucional@cbr.edu.co', 'Desarrollo institucional', 'https://cbr.edu.co/', false),
    ('GIMNASIO CAMPESTRE BETH-SHALOM', 'Guaymaral Lote 2, Puente El Otoño La Lomita, Bogota D.C.', '3003293913', 'https://bethshalom.co/', 'A', null, 'Restaurante', 'https://bethshalom.co/contacto/', false),
    ('GIMNASIO COLOMBO BRITANICO - BILINGÜE INTERNACIONAL', 'Costado suroccidental Aeropuerto Guaymaral, Bogota D.C.', '6017437047', 'https://gcb.edu.co/', 'A', 'admisiones@gcb.edu.co', 'Contacto institucional', 'https://gcb.edu.co/admisiones/', false),
    ('COLEGIO ARCA INTERNACIONAL BILINGÜE', 'Diag. 157 #77-15, Bogota D.C.', '6016829901', null, 'B', null, 'Contacto institucional', null, false),
    ('COLEGIO COLOMBO HEBREO', 'Cra. 50 #152A-55 / Av. Calle 153 #50-65, Bogota D.C.', '6018418553', 'https://www.cch.edu.co/', 'A', 'compras@cch.edu.co', 'Compras y proveedores, ext. 118', 'https://www.cch.edu.co/contacto/', false),
    ('COLEGIO SAN JORGE DE INGLATERRA', 'Cra. 92 #156-88, Bogota D.C.', '6014324000', 'https://www.sgs.edu.co/', 'A', 'sanjorge@sgs.edu.co', 'Contacto institucional', 'https://www.sgs.edu.co/', true),
    ('ASPAEN GIMNASIO IRAGUA', 'Calle 170 #76-55, Bogota D.C.', '3175007959', 'https://aspaen.edu.co/iragua/', 'A', null, 'Recepcion', 'https://aspaen.edu.co/iragua/', true),
    ('COLEGIO BILINGÜE HISPANOAMERICANO CONDE ANSÚREZ', 'Cra. 67 #173A-80, Bogota D.C.', '6013907170', 'https://hispanoamericano.edu.co/', 'A', 'admisiones@hispanoamericano.edu.co', 'Contacto institucional', 'https://hispanoamericano.edu.co/contactenos/', true),
    ('COLEGIO COLOMBO AMERICANO CAS', 'Cra. 73 #214-53, Bogota D.C.', '6016685077', 'https://colegiocolomboamericano.edu.co/', 'A', 'colamericano@cas.edu.co', 'Contacto institucional', 'https://colegiocolomboamericano.edu.co/', true),
    ('COLEGIO NUEVA INGLATERRA', 'Calle 218 #50-60, Bogota D.C.', '6016760788', 'https://colegionuevainglaterra.edu.co/', 'A', 'atencionalcliente@cni.edu.co', 'Atencion al cliente', 'https://colegionuevainglaterra.edu.co/', true)
), school_list as (
  select id
  from public.prospect_lists
  where name = 'Colegios privados Bogotá - piloto'
  limit 1
)
insert into public.prospects (
  list_id,
  company_name,
  segment,
  city,
  website,
  phone,
  address,
  status,
  priority,
  source,
  confidence_score,
  notes,
  campaign
)
select
  school_list.id,
  target_data.company_name,
  'Colegio privado',
  'Bogotá D.C.',
  target_data.website,
  target_data.phone,
  target_data.address,
  'por_revisar',
  target_data.priority,
  'Investigación pública 2026-08-26',
  90,
  concat(
    'Validación geográfica y de contacto público. Campaña Calle 153+ antes del peaje de la Autopista Norte.',
    case when target_data.source_url is not null then ' Fuente: ' || target_data.source_url else '' end
  ),
  'Colegios Norte 153+ / antes del peaje'
from target_data
cross join school_list
where target_data.is_new
  and not exists (
    select 1
    from public.prospects existing
    where lower(existing.company_name) = lower(target_data.company_name)
  );

with target_data (
  company_name,
  address,
  phone,
  website,
  priority,
  public_email,
  contact_role,
  source_url
) as (
  values
    ('COLEGIO CALATRAVA', 'Tv. 88 #157-85, Bogota D.C.', '3176426972', 'https://colegiocalatrava.edu.co/', 'A', 'admisiones@colegiocalatrava.edu.co', 'Contacto institucional', 'https://colegiocalatrava.edu.co/'),
    ('GIMNASIO CAMPESTRE', 'Calle 165 #8A-50, Bogota D.C.', '6016684400', 'https://campestre.co/', 'A', 'gimnasio@campestre.co', 'Contacto institucional', 'https://campestre.co/'),
    ('GIMNASIO CAMPESTRE ESCALEMOS', 'Cra. 56 #167C-56, Bogota D.C.', '3116280075', null, 'B', 'gc_escalemos@yahoo.es', 'Contacto institucional', null),
    ('COLEGIO DE INGLATERRA (THE ENGLISH SCHOOL)', 'Calle 170 #15-68, Bogota D.C.', '6016767700', 'https://englishschool.edu.co/', 'A', 'contactenos@englishschool.edu.co', 'Contacto institucional', 'https://englishschool.edu.co/'),
    ('COLEGIO BILINGÜE ABRAHAM LINCOLN', 'Av. Calle 170 #65-31, Bogota D.C.', '6017423166', 'https://als.edu.co/', 'A', null, 'Contacto institucional', 'https://als.edu.co/'),
    ('GIMNASIO JOSE JOAQUIN CASAS - BILINGÜE NACIONAL', 'Av. Cra. 7 #173-02, Bogota D.C.', '3166480776', 'https://gimnasiojjcasas.edu.co/', 'B', 'admisiones@gimnasiojjcasas.edu.co', 'Contacto institucional', 'https://gimnasiojjcasas.edu.co/'),
    ('GIMNASIO CAMPESTRE STEPHEN HAWKING', 'Cra. 68 #173A-50, Bogota D.C.', '3124827804', null, 'B', null, 'Contacto institucional', null),
    ('COLEGIO SANTA MARIA', 'Cra. 11 #185B-17, Bogota D.C.', '6016714440', 'https://csm.edu.co/', 'A', 'contactenos@csm.edu.co', 'Contacto institucional', 'https://csm.edu.co/'),
    ('COLEGIO GEORGE WASHINGTON SCHOOL', 'Cra. 8C #185A-24, Bogota D.C.', '6019197700', 'https://georgewashington.edu.co/', 'B', null, 'Contacto institucional', 'https://georgewashington.edu.co/'),
    ('COLEGIO SAN CARLOS', 'Calle 192 #14-45, Bogota D.C.', '6015929000', 'https://sancarlos.edu.co/', 'A', 'administracion@sancarlos.edu.co', 'Administracion', 'https://sancarlos.edu.co/'),
    ('GIMNASIO VERMONT', 'Calle 195 #54-75, Bogota D.C.', '6015185757', 'https://gimnasiovermont.edu.co/', 'A', null, 'Contacto institucional', 'https://gimnasiovermont.edu.co/'),
    ('COLEGIO LOS NOGALES', 'Calle 202 #56-50, Bogota D.C.', '6019162880', 'https://www.nogales.edu.co/', 'A', 'cln@nogales.edu.co', 'Contacto institucional', 'https://www.nogales.edu.co/'),
    ('COLEGIO SAN VIATOR BILINGÜE INTERNACIONAL', 'Autopista Norte #209-51, Bogota D.C.', '3174324990', 'https://sanviator.edu.co/', 'A', null, 'Contacto institucional', 'https://sanviator.edu.co/'),
    ('GIMNASIO LOS PORTALES COLEGIO BILINGÜE', 'Calle 212 #77-20, Bogota D.C.', '3124335325', 'https://losportales.edu.co/', 'A', 'contacto@losportales.edu.co', 'Contacto institucional', 'https://losportales.edu.co/'),
    ('COLEGIO BILINGÜE CLERMONT', 'Tv. 80 #213A-17, Bogota D.C.', '3124059410', 'https://clermont.edu.co/', 'A', 'info@clermont.edu.co', 'Contacto institucional', 'https://clermont.edu.co/'),
    ('COLEGIO BILINGÜE BUCKINGHAM', 'Cra. 52 #214-55, Bogota D.C.', '6019172136', 'https://cbk.edu.co/', 'A', 'info@cbk.edu.co', 'Contacto institucional', 'https://cbk.edu.co/'),
    ('GIMNASIO LA MONTAÑA', 'Cra. 51 #214-55, Bogota D.C.', '6016761861', null, 'A', null, 'Contacto institucional', null),
    ('COLEGIO GRAN BRETAÑA', 'Cra. 51 #215-20, Bogota D.C.', '3158873788', 'https://cgb.edu.co/', 'A', 'admissions@cgb.edu.co', 'Contacto institucional', 'https://cgb.edu.co/'),
    ('COLEGIO SAN MATEO APOSTOL BILINGÜE INTERNACIONAL', 'Calle 215 #50-24, Bogota D.C.', '6016760885', 'https://csma.edu.co/', 'A', 'info@csma.edu.co', 'Contacto institucional', 'https://csma.edu.co/'),
    ('COLEGIO ANDINO', 'Cra. 51 #218-85, Bogota D.C.', '6016684250', 'https://www.colegioandino.edu.co/', 'A', null, 'Cafeteria / proveedores', 'https://www.colegioandino.edu.co/contacto'),
    ('GIMNASIO FONTANA', 'Calle 221 #108-20, Bogota D.C.', '6017420303', 'https://gimnasiofontana.edu.co/', 'A', null, 'Cafeteria / contacto institucional', 'https://gimnasiofontana.edu.co/'),
    ('COLEGIO BILINGÜE RICHMOND', 'Cra. 53 #222-76, Bogota D.C.', '6016763864', 'https://cbr.edu.co/', 'A', 'desarrolloinstitucional@cbr.edu.co', 'Desarrollo institucional', 'https://cbr.edu.co/'),
    ('GIMNASIO CAMPESTRE BETH-SHALOM', 'Guaymaral Lote 2, Puente El Otoño La Lomita, Bogota D.C.', '3003293913', 'https://bethshalom.co/', 'A', null, 'Restaurante', 'https://bethshalom.co/contacto/'),
    ('GIMNASIO COLOMBO BRITANICO - BILINGÜE INTERNACIONAL', 'Costado suroccidental Aeropuerto Guaymaral, Bogota D.C.', '6017437047', 'https://gcb.edu.co/', 'A', 'admisiones@gcb.edu.co', 'Contacto institucional', 'https://gcb.edu.co/admisiones/'),
    ('COLEGIO ARCA INTERNACIONAL BILINGÜE', 'Diag. 157 #77-15, Bogota D.C.', '6016829901', null, 'B', null, 'Contacto institucional', null),
    ('COLEGIO COLOMBO HEBREO', 'Cra. 50 #152A-55 / Av. Calle 153 #50-65, Bogota D.C.', '6018418553', 'https://www.cch.edu.co/', 'A', 'compras@cch.edu.co', 'Compras y proveedores, ext. 118', 'https://www.cch.edu.co/contacto/'),
    ('COLEGIO SAN JORGE DE INGLATERRA', 'Cra. 92 #156-88, Bogota D.C.', '6014324000', 'https://www.sgs.edu.co/', 'A', 'sanjorge@sgs.edu.co', 'Contacto institucional', 'https://www.sgs.edu.co/'),
    ('ASPAEN GIMNASIO IRAGUA', 'Calle 170 #76-55, Bogota D.C.', '3175007959', 'https://aspaen.edu.co/iragua/', 'A', null, 'Recepcion', 'https://aspaen.edu.co/iragua/'),
    ('COLEGIO BILINGÜE HISPANOAMERICANO CONDE ANSÚREZ', 'Cra. 67 #173A-80, Bogota D.C.', '6013907170', 'https://hispanoamericano.edu.co/', 'A', 'admisiones@hispanoamericano.edu.co', 'Contacto institucional', 'https://hispanoamericano.edu.co/contactenos/'),
    ('COLEGIO COLOMBO AMERICANO CAS', 'Cra. 73 #214-53, Bogota D.C.', '6016685077', 'https://colegiocolomboamericano.edu.co/', 'A', 'colamericano@cas.edu.co', 'Contacto institucional', 'https://colegiocolomboamericano.edu.co/'),
    ('COLEGIO NUEVA INGLATERRA', 'Calle 218 #50-60, Bogota D.C.', '6016760788', 'https://colegionuevainglaterra.edu.co/', 'A', 'atencionalcliente@cni.edu.co', 'Atencion al cliente', 'https://colegionuevainglaterra.edu.co/')
), updated as (
  update public.prospects prospect
  set
    address = coalesce(prospect.address, target_data.address),
    phone = coalesce(prospect.phone, target_data.phone),
    website = coalesce(prospect.website, target_data.website),
    campaign = 'Colegios Norte 153+ / antes del peaje',
    confidence_score = greatest(coalesce(prospect.confidence_score, 0), 90),
    notes = case
      when coalesce(prospect.notes, '') like '%Campaña Calle 153+ antes del peaje%'
        then prospect.notes
      else concat_ws(
        ' | ',
        nullif(prospect.notes, ''),
        concat(
          'Validación geográfica y de contacto público 2026-08-26. Campaña Calle 153+ antes del peaje.',
          case when target_data.source_url is not null then ' Fuente: ' || target_data.source_url else '' end
        )
      )
    end,
    updated_at = now()
  from target_data
  where prospect.company_name = target_data.company_name
  returning prospect.id, target_data.public_email, target_data.phone, target_data.contact_role, target_data.source_url
)
insert into public.prospect_contacts (
  prospect_id,
  full_name,
  role,
  email,
  phone,
  notes
)
select
  updated.id,
  'Canal institucional público',
  updated.contact_role,
  lower(updated.public_email),
  updated.phone,
  concat(
    'Dato público para validación comercial; confirmar persona responsable antes de enviar campaña.',
    case when updated.source_url is not null then ' Fuente: ' || updated.source_url else '' end
  )
from updated
where not exists (
  select 1
  from public.prospect_contacts existing
  where existing.prospect_id = updated.id
    and (
      (updated.public_email is not null and lower(existing.email) = lower(updated.public_email))
      or (updated.public_email is null and existing.role = updated.contact_role)
    )
);
