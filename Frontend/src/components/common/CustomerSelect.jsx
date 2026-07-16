import React from 'react';
import SearchableSelect from '../common/SearchableSelect';

/**
 * CustomerSelect
 * Wrapper simple: solo adapta los datos de "customers" al SearchableSelect.
 * Sin creación inline (allowCreate no aplica aquí, es de CategorySelect).
 */
export default function CustomerSelect({ value, onChange, customers, disabled = false }) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={customers}
      getLabel={(c) => c.name}
      getValue={(c) => c.id}
      placeholder="Seleccionar cliente"
      searchPlaceholder="Buscar cliente..."
      emptyText="No se encontraron clientes"
      disabled={disabled}
    />
  );
}
