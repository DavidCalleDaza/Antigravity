import React, { useState, useEffect } from 'react';
import { Plus, Tags, Package, Wrench, Search, Pencil, Trash2 } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import Table from '../../components/ui/Table';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { categoryClient } from '../../utils/apiClient';

const { ADMIN, SELLER } = APP_CONFIG.ROLES;

export default function Categories() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const canManage = userRole === ADMIN || userRole === SELLER;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entityFilter, setEntityFilter] = useState('product'); // 'product' or 'service'
  const [searchQuery, setSearchQuery] = useState('');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entity_type: 'product',
    status: 'active'
  });
  
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadCategories();
  }, [entityFilter]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryClient.list(entityFilter);
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Error cargando categorías');
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openEditDrawer = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        description: cat.description || '',
        entity_type: cat.entity_type || entityFilter,
        status: cat.status || 'active'
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        entity_type: entityFilter,
        status: 'active'
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        const updated = await categoryClient.update(editingCategory.id, {
          name: formData.name,
          description: formData.description,
          status: formData.status
        });
        setCategories(categories.map(c => c.id === editingCategory.id ? updated : c));
        toast.success('Categoría actualizada exitosamente');
      } else {
        const created = await categoryClient.create(formData);
        setCategories([created, ...categories]);
        toast.success('Categoría creada exitosamente');
      }
      setIsDrawerOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await categoryClient.delete(deletingId);
      setCategories(categories.filter(c => c.id !== deletingId));
      toast.success('Categoría eliminada');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setIsConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const statusBadge = (s) => {
    const cls = { active: 'badge-success', inactive: 'badge-neutral' };
    const label = s === 'active' ? 'Activo' : 'Inactivo';
    return <span className={`badge badge-dot ${cls[s] || 'badge-neutral'}`}>{label}</span>;
  };

  const columns = [
    { key: 'name', label: 'Nombre', sortable: true, width: '200px' },
    { key: 'description', label: 'Descripción', sortable: false, width: '400px' },
    { key: 'status', label: 'Estado', sortable: true, width: '110px', render: (v) => statusBadge(v) }
  ];

  const tableActions = (row) => (
    <div className="d-flex gap-2">
      {canManage && (
        <>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => openEditDrawer(row)}>
            <Pencil width="14" height="14" />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => { setDeletingId(row.id); setIsConfirmOpen(true); }}>
            <Trash2 width="14" height="14" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Categorías</h2>
          <p className="page-description">Gestiona las categorías de tus productos y servicios</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={() => openEditDrawer(null)}>
              <Plus width="18" height="18" />
              Nueva Categoría
            </button>
          )}
        </div>
      </div>

      <div className="products-toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="d-flex gap-2">
          <button 
            className={`btn ${entityFilter === 'product' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setEntityFilter('product')}
          >
            <Package width="16" height="16" />
            Productos
          </button>
          <button 
            className={`btn ${entityFilter === 'service' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setEntityFilter('service')}
          >
            <Wrench width="16" height="16" />
            Servicios
          </button>
        </div>
        <div className="search-box" style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search width="16" height="16" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar categoría..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Cargando categorías...</div>
      ) : error ? (
        <div className="error-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h4>Error al cargar</h4>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button className="btn btn-outline" onClick={loadCategories} style={{ marginTop: '1rem' }}>Reintentar</button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredCategories}
          actions={tableActions}
        />
      )}

      {/* Drawer para Crear/Editar */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        position="right"
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form className="d-flex flex-col gap-5" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.entity_type === 'product' ? 'Producto' : 'Servicio'} 
              disabled 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nombre <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
          </div>

          {editingCategory && (
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsDrawerOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Eliminar Categoría"
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsConfirmOpen(false) },
          { label: 'Confirmar', className: 'btn-danger', onClick: handleDelete }
        ]}
      >
        <div style={{ color: 'var(--text-secondary)', width: '100%', display: 'block', margin: 0, textWrap: 'wrap', gridColumn: '1 / -1' }}>
          ¿Estás seguro de que deseas eliminar esta categoría? Si está siendo usada por algún {entityFilter === 'product' ? 'producto' : 'servicio'}, la acción será denegada.
        </div>
      </Modal>

    </div>
  );
}
