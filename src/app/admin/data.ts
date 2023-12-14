import React from "react";
const columns = [
  {name: "Nombre", uid: "name", sortable: true},
  {name: "Rol", uid: "role", sortable: true},
  {name: "Correo Electronico", uid: "email"},
  {name: "Estado", uid: "status", sortable: true},
  {name: "Opciones", uid: "actions"},
];

const statusOptions = [
  {name: "Activo", uid: "activo"},
  {name: "Restringido", uid: "restringido"},
  {name: "Vacaciones", uid: "vacaciones"},
];

export {columns, statusOptions};
