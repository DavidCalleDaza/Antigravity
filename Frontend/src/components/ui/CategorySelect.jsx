import React, { useState } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { categoryClient } from '../../utils/apiClient';
import { useToast } from './Toast';
import SearchableSelect from '../common/SearchableSelect';
import '../../../css/pages/CategorySelect.css';

export default function CategorySelect({ value, onChange, entityType, categories, onCategoryCreated }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toast = useToast();

  function resetCreateState() {
    setShowCreateForm(false);
    setErrorMsg('');
    setNewCategoryName('');
  }

  const handleCreateCategory = async (e, close) => {
    e.preventDefault();
    setErrorMsg('');
    const nameClean = newCategoryName.trim();

    if (!nameClean) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }

    // Client-side duplicate check (case-insensitive)
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === nameClean.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg('Esta categoría ya existe.');
      return;
    }

    setCreating(true);
    try {
      const newCat = await categoryClient.create({
        name: nameClean,
        entity_type: entityType,
      });
      toast.success(`Categoría "${newCat.name}" creada.`);
      resetCreateState();

      if (onCategoryCreated) {
        await onCategoryCreated();
      }

      onChange(newCat.id);
      close();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear la categoría.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={categories}
      getLabel={(c) => c.name}
      getValue={(c) => c.id}
      placeholder="Seleccionar categoría"
      searchPlaceholder="Buscar categoría..."
      onClose={resetCreateState}
      clearable
      renderOption={(c, { isSelected, select }) => (
        <button
          type="button"
          className={`category-select-item ${isSelected ? 'category-select-item--selected' : ''}`}
          onClick={select}
          style={{ paddingLeft: `${16 + (c.depth || 0) * 12}px` }}
        >
          <span className="category-select-item-name">
            {'-'.repeat(c.depth || 0)} {c.name}
          </span>
          {isSelected && <Check width="14" height="14" className="category-select-check" />}
        </button>
      )}
      footer={({ close }) =>
        !showCreateForm ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm category-select-add-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus width="14" height="14" />
            Nueva Categoría
          </button>
        ) : (
          <div className="category-select-create-form">
            <input
              type="text"
              className="form-input category-select-create-input"
              placeholder="Nombre de categoría..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateCategory(e, close);
                }
              }}
              disabled={creating}
              autoFocus
            />
            {errorMsg && <div className="category-select-error">{errorMsg}</div>}
            <div className="category-select-create-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetCreateState}
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={(e) => handleCreateCategory(e, close)}
                disabled={creating || !newCategoryName.trim()}
              >
                {creating ? <Loader2 width="14" height="14" className="spin" /> : 'Crear'}
              </button>
            </div>
          </div>
        )
      }
    />
  );
}