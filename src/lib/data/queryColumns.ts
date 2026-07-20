export const COMPANY_COLUMNS =
  "id,name,legal_name,nit,segment,city,website,phone,address,status,notes,created_at,updated_at";

export const CONTACT_COLUMNS =
  "id,company_id,company_name,full_name,role,email,phone,notes,created_at,updated_at,contact_type,priority,mobile_phone,office_phone,is_primary,source,confidence";

export const ACTIVITY_COLUMNS =
  "id,company_id,contact_id,activity_type,notes,activity_date,due_date,completed,created_at";

export const PROSPECT_LIST_COLUMNS =
  "id,name,segment,source,city,status,notes,created_at,updated_at";

export const PROSPECT_COLUMNS =
  "id,list_id,company_name,legal_name,nit,segment,city,website,phone,address,status,priority,source,confidence_score,notes,converted_company_id,created_at,updated_at";

export const PROSPECT_CONTACT_COLUMNS =
  "id,prospect_id,full_name,role,email,phone,linkedin_url,notes,created_at,updated_at";

export const PROSPECT_ACTIVITY_COLUMNS =
  "id,prospect_id,contact_id,activity_type,notes,activity_date,due_date,completed,created_at";
