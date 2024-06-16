create table Civitai (
  id number primary key,
  model_id number,
  model_name varchar2(255),
  description text,
  create_date date,
  update_date date,
  create_user varchar2(255),
  metadata json,
);
