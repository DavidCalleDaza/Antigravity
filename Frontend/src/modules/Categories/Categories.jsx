import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Pencil, Power, FolderTree, Package, Wrench, Loader2, AlertTriangle } from 'lucide-react';
import { categoryClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Drawer from '../../components/ui/Drawer';
import { useStore } from '../../store/useStore';
import '../../../css/pages/Categories.css';

const EMPTY_FORM = { name: '', description: '', parent_id: '' };
const DRAG_THRESHOLD = 6; // px mínimos de movimiento para iniciar el arrastre

function buildOrderedTree(categories) {
  const idsInList = new Set(categories.map((c) => c.id));
  const byParent = {};
  categories.forEach((c) => {
    const key = (c.parent_id && idsInList.has(c.parent_id)) ? c.parent_id : 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  });
  Object.values(byParent).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));

  const ordered = [];
  function walk(parentKey) {
    const children = byParent[parentKey] || [];
    children.forEach((c) => {
      ordered.push(c);
      walk(c.id);
    });
  }
  walk('root');
  return ordered;
}

function getSelfAndDescendantIds(categories, rootId) {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    categories.forEach((c) => {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        added = true;
      }
    });
  }
  return ids;
}

export default function Categories() {
  const toast = useToast();
  const { currentUser } = useStore();
  const canManage = ['admin', 'seller'].includes(currentUser?.role);

  const [activeEntityType, setActiveEntityType] = useState('product');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Estados de activación/desactivación
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  // --- Estados de arrastre ---
  const [draggingId, setDraggingId] = useState(null);
  const [hoverTargetId, setHoverTargetId] = useState(null);
  const [hoverRoot, setHoverRoot] = useState(false);
  const [moving, setMoving] = useState(false);

  const dragStateRef = useRef({ candidateId: null, startX: 0, startY: 0, dragging: false });
  const hoverStateRef = useRef({ targetId: null, isRoot: false });
  const categoriesRef = useRef(categories);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const loadCategories = async (entityType, filterVal) => {
    setLoading(true);
    try {
      // Truco: Si el filtro no es 'active', inyectamos el parámetro pegado al tipo de entidad
      const queryArg = filterVal === 'active' 
        ? entityType 
        : `${entityType}&active_only=false`;

      const data = await categoryClient.list(queryArg);
      
      console.log("Categorías devueltas por el backend:", data);
      setCategories(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar las categorías.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(activeEntityType, statusFilter);
  }, [activeEntityType, statusFilter]);

  // Filtra localmente las categorías según el estado seleccionado
 const filteredCategories = useMemo(() => {
    if (statusFilter === 'all') return categories;
    if (statusFilter === 'active') return categories.filter((c) => c.status === 'active');
    if (statusFilter === 'inactive') return categories.filter((c) => c.status !== 'active');
    return categories;
  }, [categories, statusFilter]);

  // Construye el árbol basándose únicamente en las categorías filtradas
  const orderedCategories = useMemo(() => buildOrderedTree(filteredCategories), [filteredCategories]);

  const parentOptions = useMemo(() => {
    const activeCategories = categories.filter((c) => c.status === 'active');
    if (!editingCategory) return buildOrderedTree(activeCategories);
    const excluded = getSelfAndDescendantIds(categories, editingCategory.id);
    return buildOrderedTree(activeCategories).filter((c) => !excluded.has(c.id));
  }, [categories, editingCategory]);
  const openCreateDrawer = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDrawerOpen(true);
  };

  const openEditDrawer = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || '',
    });
    setFormError('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameClean = form.name.trim();
    if (!nameClean) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingCategory) {
        await categoryClient.update(editingCategory.id, {
          name: nameClean,
          description: form.description.trim() || null,
          parent_id: form.parent_id || null,
        });
        toast.success('Categoría actualizada correctamente.');
      } else {
        await categoryClient.create({
          name: nameClean,
          description: form.description.trim() || null,
          entity_type: activeEntityType,
          parent_id: form.parent_id || null,
        });
        toast.success('Categoría creada correctamente.');
      }
      closeDrawer();
      await loadCategories(activeEntityType);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error al guardar la categoría.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const newStatus = toggleTarget.status === 'active' ? 'inactive' : 'active';
      
      await categoryClient.update(toggleTarget.id, { status: newStatus });
      
      toast.success(newStatus === 'active' ? 'Categoría reactivada.' : 'Categoría desactivada.');
      setToggleTarget(null);
      
      // Importante: Pasar el statusFilter aquí para mantener la pestaña actual
      await loadCategories(activeEntityType, statusFilter); 
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo actualizar el estado de la categoría.');
    } finally {
      setToggling(false);
    }
  };

  // ---------------------------------------------------------------------
  // Sistema de Arrastre con Pointer Events (Soporte Móvil + Escritorio)
  // ---------------------------------------------------------------------

  const isInvalidDropTarget = useCallback((sourceId, targetId) => {
    if (sourceId === targetId) return true;
    const excluded = getSelfAndDescendantIds(categoriesRef.current, sourceId);
    return excluded.has(targetId);
  }, []);

  const moveCategory = useCallback(async (sourceId, newParentId) => {
    const source = categoriesRef.current.find((c) => c.id === sourceId);
    if (!source) return;
    if ((source.parent_id || null) === (newParentId || null)) return;
    
    setMoving(true);
    try {
      await categoryClient.update(sourceId, { parent_id: newParentId || null });
      const parentName = newParentId ? categoriesRef.current.find((c) => c.id === newParentId)?.name : null;
      toast.success(
        parentName
          ? `"${source.name}" ahora es subcategoría de "${parentName}".`
          : `"${source.name}" ahora está en el nivel raíz.`
      );
      await loadCategories(activeEntityType);
    } catch (err) {
      toast.error(err.message || 'No se pudo mover la categoría.');
    } finally {
      setMoving(false);
    }
  }, [activeEntityType, toast]);

  const resetDragState = useCallback(() => {
    dragStateRef.current = { candidateId: null, startX: 0, startY: 0, dragging: false };
    hoverStateRef.current = { targetId: null, isRoot: false };
    setDraggingId(null);
    setHoverTargetId(null);
    setHoverRoot(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handlePointerMoveGlobal = useCallback((e) => {
    const st = dragStateRef.current;
    if (!st.candidateId) return;

    if (!st.dragging) {
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      
      st.dragging = true;
      setDraggingId(st.candidateId);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    const scrollThreshold = 90;
    const scrollSpeed = 10;
    
    if (e.clientY < scrollThreshold) {
      window.scrollBy(0, -scrollSpeed);
    } else if (window.innerHeight - e.clientY < scrollThreshold) {
      window.scrollBy(0, scrollSpeed);
    }

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    const rootZone = el.closest('[data-drop-root]');
    if (rootZone) {
      if (!hoverStateRef.current.isRoot) {
        setHoverRoot(true);
        setHoverTargetId(null);
        hoverStateRef.current = { targetId: null, isRoot: true };
      }
      return;
    }
    setHoverRoot(false);

    const row = el.closest('[data-category-id]');
    if (row) {
      const targetId = row.getAttribute('data-category-id');
      const validTargetId = targetId === st.candidateId ? null : targetId;
      
      if (hoverStateRef.current.targetId !== validTargetId) {
        setHoverTargetId(validTargetId);
        hoverStateRef.current = { targetId: validTargetId, isRoot: false };
      }
    } else {
      if (hoverStateRef.current.targetId !== null || hoverStateRef.current.isRoot) {
        setHoverTargetId(null);
        hoverStateRef.current = { targetId: null, isRoot: false };
      }
    }
  }, []);

  const handlePointerUpGlobal = useCallback((e) => {
    const st = dragStateRef.current;
    const wasDragging = st.dragging;
    const sourceId = st.candidateId;

    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerUp);

    if (wasDragging && sourceId) {
      const { targetId, isRoot } = hoverStateRef.current;

      if (isRoot) {
        moveCategory(sourceId, null);
      } else if (targetId) {
        if (isInvalidDropTarget(sourceId, targetId)) {
          toast.warning('No puedes mover una categoría dentro de sí misma o de una de sus subcategorías.');
        } else {
          moveCategory(sourceId, targetId);
        }
      }
    }

    resetDragState();
  }, [isInvalidDropTarget, moveCategory, resetDragState]);

  const handlersRef = useRef({});
  handlersRef.current = {
    handlePointerMoveGlobal,
    handlePointerUpGlobal,
  };

  const onWindowPointerMove = useCallback((e) => {
    handlersRef.current.handlePointerMoveGlobal?.(e);
  }, []);

  const onWindowPointerUp = useCallback((e) => {
    handlersRef.current.handlePointerUpGlobal?.(e);
  }, []);

  const handlePointerDownRow = (e, id) => {
    if (!canManage) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
      return; 
    }

    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignorar fallos de captura
    }

    e.preventDefault();

    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerUp);

    dragStateRef.current = { candidateId: id, startX: e.clientX, startY: e.clientY, dragging: false };
    
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [onWindowPointerMove, onWindowPointerUp]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <FolderTree width="20" height="20" className="page-title-icon" />
          <h2 className="page-title">Categorías</h2>
          <p className="page-description">Organiza tus productos por categorías</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openCreateDrawer}>
              <Plus width="18" height="18" />
              Nueva Categoría
            </button>
          )}
        </div>
      </div>

      {/* FILTROS Y TABS */}
      <div className="categories-filter-row">
        <div className="categories-tabs">
          <button
            type="button"
            className={`categories-tab ${activeEntityType === 'product' ? 'is-active' : ''}`}
            onClick={() => setActiveEntityType('product')}
          >
            <Package width="16" height="16" /> Productos
          </button>
          <button
            type="button"
            className={`categories-tab ${activeEntityType === 'service' ? 'is-active' : ''}`}
            onClick={() => setActiveEntityType('service')}
          >
            <Wrench width="16" height="16" /> Servicios
          </button>
        </div>

        {/* FILTRO SEGMENTADO DE ESTADOS */}
        <div className="categories-status-filter-group">
          <button
            type="button"
            className={`status-filter-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`status-filter-btn ${statusFilter === 'active' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Activos
          </button>
          <button
            type="button"
            className={`status-filter-btn ${statusFilter === 'inactive' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="categories-list-card">
        {canManage && draggingId && (
          <div
            data-drop-root="true"
            className={`categories-root-dropzone ${hoverRoot ? 'is-active' : ''}`}
          >
            Suelta aquí para quitarla de su categoría padre (nivel raíz)
          </div>
        )}
        {loading ? (
          <div className="categories-empty-state">
            <Loader2 className="animate-spin" width="24" height="24" />
            <span>Cargando categorías...</span>
          </div>
        ) : orderedCategories.length === 0 ? (
          <div className="categories-empty-state">
            <FolderTree width="32" height="32" style={{ opacity: 0.4 }} />
            <span>No hay categorías de {activeEntityType === 'product' ? 'productos' : 'servicios'} todavía.</span>
            {canManage && (
              <button type="button" className="btn btn-outline btn-sm" onClick={openCreateDrawer}>
                <Plus width="14" height="14" /> Crear la primera
              </button>
            )}
          </div>
        ) : (
          <table className="categories-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                {canManage && <th style={{ width: '90px', textAlign: 'center' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {orderedCategories.map((c) => {
                const isDragging = draggingId === c.id;
                const isHovered = hoverTargetId === c.id;

                return (
                  <tr
                    key={c.id}
                    data-category-id={c.id}
                    onPointerDown={(e) => handlePointerDownRow(e, c.id)}
                    style={{
                      pointerEvents: isDragging ? 'none' : 'auto',
                      opacity: isDragging ? 0.4 : 1,
                    }}
                    className={[
                      canManage ? 'is-draggable' : '',
                      isDragging ? 'is-dragging' : '',
                      isHovered ? 'is-drag-over' : '',
                      c.status !== 'active' ? 'is-inactive-row' : '', // Cambiado aquí
                    ].filter(Boolean).join(' ')}
                  >
                    <td>
                      <span
                        className="categories-name-cell"
                        style={{ paddingLeft: `${(c.depth || 0) * 20}px` }}
                      >
                        {c.depth > 0 && <span className="categories-tree-marker">└</span>}
                        {c.name}
                      </span>
                    </td>
                    <td className="categories-description-cell">
                      {c.description || <span className="text-secondary">—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {/* Cambiado aquí */}
                      <span className={`categories-status-badge ${c.status === 'active' ? 'is-active' : 'is-inactive'}`}>
                        {c.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        <div className="categories-row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon-only"
                            title="Editar categoría"
                            onClick={() => openEditDrawer(c)}
                          >
                            <Pencil width="14" height="14" />
                          </button>
                          <button
                            type="button"
                            /* Cambiado aquí */
                            className={`btn btn-ghost btn-sm btn-icon-only ${c.status === 'active' ? 'text-danger' : 'text-success'}`}
                            title={c.status === 'active' ? 'Desactivar categoría' : 'Reactivar categoría'}
                            onClick={() => setToggleTarget(c)}
                          >
                            <Power width="14" height="14" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DRAWER: Crear / Editar */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        position="right"
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form className="d-flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Nombre <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Electrónica, Consultoría..."
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción opcional de la categoría"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Categoría Padre (opcional)</label>
            <select
              className="form-select"
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
            >
              <option value="">Sin categoría padre (nivel raíz)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {'—'.repeat(c.depth || 0)} {c.name}
                </option>
              ))}
            </select>
          </div>

          {formError && <div className="categories-form-error">{formError}</div>}

          <div style={{ border: 'none', padding: 0, marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-outline" onClick={closeDrawer} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* MODAL: Confirmar activar/desactivar */}
      {toggleTarget && (
        <div className="modal-overlay active" onClick={() => !toggling && setToggleTarget(null)}>
          <div className="categories-confirm-modal" onClick={(e) => e.stopPropagation()}>
            {/* Cambiado aquí */}
            <div className={`categories-confirm-icon ${toggleTarget.status === 'active' ? 'is-danger' : 'is-success'}`}>
              <AlertTriangle width="22" height="22" />
            </div>
            {/* Cambiado aquí */}
            <h3>{toggleTarget.status === 'active' ? '¿Desactivar esta categoría?' : '¿Reactivar esta categoría?'}</h3>
            <p>
              {/* Cambiado aquí */}
              {toggleTarget.status === 'active' ? (
                <>
                  Las subcategorías e ítems vinculados a <strong>{toggleTarget.name}</strong> mantendrán su relación, pero esta categoría ya no se podrá seleccionar para nuevos elementos.
                </>
              ) : (
                <>
                  <strong>{toggleTarget.name}</strong> volverá a estar disponible para vincularla a nuevos productos o servicios.
                </>
              )}
            </p>
            <div className="categories-confirm-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setToggleTarget(null)}
                disabled={toggling}
              >
                Cancelar
              </button>
              <button
                type="button"
                /* Cambiado aquí */
                className={toggleTarget.status === 'active' ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={handleConfirmToggle}
                disabled={toggling}
              >
                {toggling ? 'Guardando...' : toggleTarget.status === 'active' ? 'Sí, Desactivar' : 'Sí, Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}