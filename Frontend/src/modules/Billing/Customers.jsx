import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Search, Users, Power, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { billingClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import CustomerModal from './CustomerModal';
import '../../../css/pages/Customers.css';

export default function Customers() {
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const loadCustomers = useCallback(async (searchTerm, filterVal) => {
    setLoading(true);
    try {
      // Si el filtro es 'active', pedimos solo activos. De lo contrario pedimos todos (false)
      const activeOnlyParam = filterVal === 'active';
      const params = { active_only: activeOnlyParam };
      
      if (searchTerm) params.search = searchTerm;
      
      let data = await billingClient.listCustomers(params);
      
      // Si el usuario quiere ver estrictamente inactivos, filtramos localmente el resultado
      if (filterVal === 'inactive') {
        data = (data || []).filter(c => !c.is_active);
      }
      
      setCustomers(data || []);
      setCurrentPage(1); 
    } catch (err) {
      toast.error('Error al cargar los clientes.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(search, statusFilter);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, statusFilter, loadCustomers]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSaved = () => {
    closeModal();
    loadCustomers(search, statusFilter);
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const newActiveState = !toggleTarget.is_active;
      await billingClient.updateCustomer(toggleTarget.id, { is_active: newActiveState });
      toast.success(newActiveState ? 'Cliente reactivado.' : 'Cliente desactivado.');
      setToggleTarget(null);
      loadCustomers(search, statusFilter);
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el estado del cliente.');
    } finally {
      setToggling(false);
    }
  };

  // Cálculos de paginación local
  const totalItems = customers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = customers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Sub-componente de Skeleton para simular carga
  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton-line" style={{ width: '130px' }} /></td>
          <td><div className="skeleton-line" style={{ width: '90px' }} /></td>
          <td><div className="skeleton-line" style={{ width: '160px' }} /></td>
          <td><div className="skeleton-line" style={{ width: '80px' }} /></td>
          <td><div className="skeleton-line" style={{ width: '70px' }} /></td>
          <td><div className="skeleton-line" style={{ width: '50px', margin: '0 auto' }} /></td>
          <td><div className="skeleton-line" style={{ width: '60px', margin: '0 auto' }} /></td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Users width="20" height="20" className="page-title-icon" />
          <h2 className="page-title">Clientes</h2>
          <p className="page-description">Gestiona la información de tus clientes</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus width="18" height="18" />
            Nuevo Cliente
          </button>
        </div>
      </div>


      {/* BÚSQUEDA Y FILTROS */}
      <div className="customers-filters">
        <div className="customers-search-box">
          <Search width="14" height="14" className="customers-search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre o NIT/Documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="customers-search-clear"
              onClick={() => setSearch('')}
              title="Limpiar búsqueda"
            >
              <X width="14" height="14" />
            </button>
          )}
        </div>
        
        {/* FILTRO SEGMENTADO DE ESTADOS */}
        <div className="customers-status-filter-group">
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
      <div className="customers-list-card">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Régimen</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton />
            ) : currentCustomers.length > 0 ? (
              currentCustomers.map((c) => (
                <tr key={c.id} className={!c.is_active ? 'is-inactive-row' : ''}>
                  <td>
                    <div className="customers-name-cell">
                      <span className="customers-name">{c.business_name}</span>
                      {c.is_preferred && <span className="customers-pref-badge">★ PREF</span>}
                    </div>
                  </td>
                  <td className="text-secondary">{c.id_type} {c.id_number}{c.dv ? `-${c.dv}` : ''}</td>
                  <td className="text-secondary">{c.email}</td>
                  <td className="text-secondary">{c.phone || '—'}</td>
                  <td className="text-secondary">{c.tax_regime}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`customers-status-badge ${c.is_active ? 'is-active' : 'is-inactive'}`}>
                      {c.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="customers-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon-only"
                        title="Editar cliente"
                        onClick={() => openEditModal(c)}
                      >
                        <Pencil width="14" height="14" />
                      </button>
                      <button
                        type="button"
                        className={`btn btn-ghost btn-sm btn-icon-only ${c.is_active ? 'text-danger' : 'text-success'}`}
                        title={c.is_active ? 'Desactivar cliente' : 'Reactivar cliente'}
                        onClick={() => setToggleTarget(c)}
                      >
                        <Power width="14" height="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : null}
          </tbody>
        </table>

        {/* Estado vacío */}
        {!loading && customers.length === 0 && (
          <div className="customers-empty-state">
            <Users width="32" height="32" style={{ opacity: 0.4 }} />
            <span>{search ? 'No se encontraron clientes con ese criterio.' : 'No hay clientes registrados todavía.'}</span>
            {!search && (
              <button type="button" className="btn btn-outline btn-sm" onClick={openCreateModal}>
                <Plus width="14" height="14" /> Registrar el primero
              </button>
            )}
          </div>
        )}

        {/* PIE DE TABLA CON CONTROLES DE PAGINACIÓN */}
        {!loading && totalItems > 0 && (
          <div className="customers-pagination-container">
            <div className="customers-pagination-info">
              Mostrando <strong>{indexOfFirstItem + 1}</strong> - <strong>{Math.min(indexOfLastItem, totalItems)}</strong> de <strong>{totalItems}</strong> clientes
            </div>
            
            {totalPages > 1 && (
              <div className="customers-pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Anterior"
                >
                  <ChevronLeft width="16" height="16" />
                </button>

                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      className={`pagination-btn ${currentPage === pageNum ? 'is-active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Siguiente"
                >
                  <ChevronRight width="16" height="16" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Crear / Editar */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSave={handleSaved}
        customerToEdit={editingCustomer}
      />

      {/* MODAL: Confirmar activar/desactivar */}
      {toggleTarget && (
        <div className="modal-overlay active" onClick={() => !toggling && setToggleTarget(null)}>
          <div className="customers-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`customers-confirm-icon ${toggleTarget.is_active ? 'is-danger' : 'is-success'}`}>
              <AlertTriangle width="22" height="22" />
            </div>
            <h3>{toggleTarget.is_active ? '¿Desactivar este cliente?' : '¿Reactivar este cliente?'}</h3>
            <p>
              {toggleTarget.is_active ? (
                <>
                  <strong>{toggleTarget.business_name}</strong> dejará de aparecer al buscar clientes para nuevas
                  facturas, pero sus facturas existentes no se ven afectadas.
                </>
              ) : (
                <>
                  <strong>{toggleTarget.business_name}</strong> volverá a estar disponible para nuevas facturas.
                </>
              )}
            </p>
            <div className="customers-confirm-actions">
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
                className={toggleTarget.is_active ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={handleConfirmToggle}
                disabled={toggling}
              >
                {toggling ? 'Guardando...' : toggleTarget.is_active ? 'Sí, Desactivar' : 'Sí, Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}