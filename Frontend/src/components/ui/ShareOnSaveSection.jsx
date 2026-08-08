import React from 'react';

export default function ShareOnSaveSection({ accounts = [], selectedNetworks = [], onChange }) {
  const hasAccounts = accounts.length > 0;
  const allSelected = hasAccounts && selectedNetworks.length === accounts.length;

  const toggleAll = (e) => {
    onChange(e.target.checked ? accounts.map(a => a.id) : []);
  };

  const toggleNetwork = (id) => {
    onChange(selectedNetworks.includes(id) ? selectedNetworks.filter(x => x !== id) : [...selectedNetworks, id]);
  };

  return (
    <div className="share-on-save">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Publicar al guardar (opcional)</label>
        <label className="share-checkbox-label" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={!hasAccounts}
            className="form-checkbox"
          />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seleccionar todas</span>
        </label>
      </div>
      <div className="share-networks-inline">
        {!hasAccounts && (
          <div className="text-xs text-secondary mt-1">No hay cuentas activas. Conecta una en tu perfil.</div>
        )}
        {accounts.map(account => (
          <label key={account.id} className="share-checkbox-label">
            <input
              type="checkbox"
              checked={selectedNetworks.includes(account.id)}
              onChange={() => toggleNetwork(account.id)}
              className="form-checkbox"
            />
            <span>{account.display_label || account.platform_username || account.platform_user_id} ({account.platform})</span>
          </label>
        ))}
      </div>
    </div>
  );
}
