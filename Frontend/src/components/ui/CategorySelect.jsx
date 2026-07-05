import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, ChevronDown, Loader2 } from 'lucide-react';
import { categoryClient } from '../../utils/apiClient';
import { useToast } from './Toast';
import '../../../css/pages/CategorySelect.css';

export default function CategorySelect({ value, onChange, entityType, categories, onCategoryCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const dropdownRef = useRef(null);
  const toast = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setErrorMsg('');
        setNewCategoryName('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategory = categories.find(c => c.id === value);

  // Filter categories based on search query
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const nameClean = newCategoryName.trim();
    
    if (!nameClean) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }

    // Client-side duplicate check (case-insensitive)
    const duplicate = categories.find(
      c => c.name.toLowerCase() === nameClean.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg('Esta categoría ya existe.');
      return;
    }

    setCreating(true);
    try {
      const newCat = await categoryClient.create({
        name: nameClean,
        entity_type: entityType
      });
      toast.success(`Categoría "${newCat.name}" creada.`);
      setNewCategoryName('');
      setShowCreateForm(false);
      
      // Trigger parent reload
      if (onCategoryCreated) {
        await onCategoryCreated();
      }
      
      // Select the newly created category
      onChange(newCat.id);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear la categoría.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="category-select-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="category-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="category-select-trigger-text">
          {selectedCategory ? selectedCategory.name : 'Seleccionar categoría'}
        </span>
        <ChevronDown width="16" height="16" className="category-select-chevron" />
      </button>

      {isOpen && (
        <div className="category-select-dropdown">
          {/* Search Bar */}
          <div className="category-select-search-wrapper">
            <Search width="14" height="14" className="category-select-search-icon" />
            <input
              type="text"
              className="category-select-search-input"
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Categories List */}
          <div className="category-select-list">
            {filteredCategories.length === 0 ? (
              <div className="category-select-no-results">Sin resultados</div>
            ) : (
              filteredCategories.map(c => {
                const isSelected = c.id === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`category-select-item ${isSelected ? 'category-select-item--selected' : ''}`}
                    onClick={() => {
                      onChange(c.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    style={{ paddingLeft: `${16 + (c.depth || 0) * 12}px` }}
                  >
                    <span className="category-select-item-name">
                      {'-'.repeat(c.depth || 0)} {c.name}
                    </span>
                    {isSelected && <Check width="14" height="14" className="category-select-check" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Create New Category inline */}
          <div className="category-select-footer">
            {!showCreateForm ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm category-select-add-btn"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus width="14" height="14" />
                Nueva Categoría
              </button>
            ) : (
              <form onSubmit={handleCreateCategory} className="category-select-create-form">
                <input
                  type="text"
                  className="form-input category-select-create-input"
                  placeholder="Nombre de categoría..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={creating}
                  autoFocus
                />
                {errorMsg && <div className="category-select-error">{errorMsg}</div>}
                <div className="category-select-create-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowCreateForm(false);
                      setErrorMsg('');
                      setNewCategoryName('');
                    }}
                    disabled={creating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={creating || !newCategoryName.trim()}
                  >
                    {creating ? <Loader2 width="14" height="14" className="spin" /> : 'Crear'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
