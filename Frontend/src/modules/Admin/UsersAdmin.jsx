import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Store,
  UserCheck,
  AlertCircle,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  KeyRound,
  Loader2,
  X,
  Power,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { adminUsersClient } from '../../utils/apiClient';
import { useStore } from '../../store/useStore';
import Avatar from '../../components/common/Avatar';
import Modal from '../../components/ui/Modal';
import Helpers from '../../utils/helpers';
import '../../../css/pages/UsersAdmin.css';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'admin', label: 'Administrador' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'client', label: 'Cliente' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Solo Activos' },
  { value: 'inactive', label: 'Solo Inactivos' },
  { value: 'pending', label: 'Pendientes de Aprobación' },
];

export default function UsersAdmin() {
  const toast = useToast();
  const currentUser = useStore((state) => state.currentUser);

  // ── States ──
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  // ── Selection State for Bulk Actions ──
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // ── Filters & Pagination ──
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // ── Modals State ──
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [savingUser, setSavingUser] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  // ── Form States ──
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'client',
    business_name: '',
    is_active: true,
    is_staff: false,
    is_approved: true,
  });

  const [editFormData, setEditFormData] = useState({
    email: '',
    full_name: '',
    role: 'client',
    business_name: '',
    is_active: true,
    is_staff: false,
    is_approved: true,
    password: '',
  });

  // ── Load Stats ──
  const loadStats = useCallback(async () => {
    try {
      const statsData = await adminUsersClient.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, []);

  // ── Load Users List ──
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: page,
        size: pageSize,
      };

      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter === 'active') params.is_active = true;
      if (statusFilter === 'inactive') params.is_active = false;
      if (statusFilter === 'pending') params.is_approved = false;

      const res = await adminUsersClient.listUsers(params);
      setUsers(res.items || []);
      setTotalUsers(res.total || 0);
    } catch (err) {
      toast.error('Error al cargar listado de usuarios');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ── Selection Handlers ──
  const selectableUsers = useMemo(() => {
    return users.filter((u) => u.id !== currentUser?.id);
  }, [users, currentUser?.id]);

  const isAllSelected = useMemo(() => {
    if (!selectableUsers.length) return false;
    return selectableUsers.every((u) => selectedIds.includes(u.id));
  }, [selectableUsers, selectedIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableUsers.map((u) => u.id));
    }
  };

  const handleToggleSelect = (id) => {
    if (id === currentUser?.id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ── Handlers ──
  const handleOpenCreateModal = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'client',
      business_name: '',
      is_active: true,
      is_staff: false,
      is_approved: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.email.trim() || !formData.full_name.trim() || !formData.password.trim()) {
      toast.error('Por favor completa todos los campos requeridos.');
      return;
    }

    setSavingUser(true);
    try {
      await adminUsersClient.createUser(formData);
      toast.success('¡Usuario creado!', `Se creó la cuenta para ${formData.email}`);
      setIsCreateModalOpen(false);
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Error al crear usuario', err.message || 'Verifica los datos.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setTargetUser(user);
    setEditFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role || 'client',
      business_name: user.business_name || '',
      is_active: user.is_active ?? true,
      is_staff: user.is_staff ?? false,
      is_approved: user.is_approved ?? true,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!targetUser) return;

    setSavingUser(true);
    try {
      const payload = { ...editFormData };
      if (!payload.password) delete payload.password; // Do not send empty password

      await adminUsersClient.updateUser(targetUser.id, payload);
      toast.success('¡Usuario actualizado!', `Se actualizaron los datos de ${editFormData.full_name}`);
      setIsEditModalOpen(false);
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Error al actualizar usuario', err.message || 'Verifica los datos.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes desactivar tu propia cuenta de Administrador.');
      return;
    }
    const newStatus = !user.is_active;
    try {
      await adminUsersClient.updateUser(user.id, { is_active: newStatus });
      toast.success(
        newStatus ? 'Usuario reactivado' : 'Usuario desactivado',
        `La cuenta de ${user.full_name} ahora está ${newStatus ? 'activa' : 'inactiva'}.`
      );
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Error al cambiar estado de cuenta');
    }
  };

  const handleQuickApprove = async (user) => {
    try {
      await adminUsersClient.updateUser(user.id, { is_approved: true });
      toast.success('¡Cuenta Aprobada!', `Se aprobó el acceso para ${user.full_name}.`);
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Error al aprobar usuario');
    }
  };

  const handleOpenDeleteModal = (user) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes eliminar tu propia cuenta de Administrador.');
      return;
    }
    setTargetUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (permanent = false) => {
    if (!targetUser) return;
    setSavingUser(true);
    try {
      await adminUsersClient.deleteUser(targetUser.id, permanent);
      toast.success(
        permanent ? 'Usuario eliminado permanentemente' : 'Usuario desactivado',
        `La cuenta ${targetUser.email} ha sido ${permanent ? 'eliminada del sistema' : 'desactivada'}.`
      );
      setIsDeleteModalOpen(false);
      setSelectedIds((prev) => prev.filter((id) => id !== targetUser.id));
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Error al eliminar usuario', err.message);
    } finally {
      setSavingUser(false);
    }
  };

  // ── Bulk Deletion Handler ──
  const handleBulkDeleteConfirm = async (permanent = false) => {
    if (!selectedIds.length) return;
    setIsBulkDeleting(true);
    try {
      const res = await adminUsersClient.bulkDeleteUsers(selectedIds, permanent);
      toast.success(
        permanent ? 'Eliminación masiva completada' : 'Desactivación masiva completada',
        res.message || `${selectedIds.length} usuarios procesados.`
      );
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error('Error en operación masiva', err.message || 'Inténtalo de nuevo.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="role-badge role-badge-admin">
            <ShieldCheck width="12" height="12" /> Administrador
          </span>
        );
      case 'seller':
        return (
          <span className="role-badge role-badge-seller">
            <Store width="12" height="12" /> Vendedor
          </span>
        );
      default:
        return (
          <span className="role-badge role-badge-client">
            <UserCheck width="12" height="12" /> Cliente
          </span>
        );
    }
  };

  return (
    <div className="page-content users-admin-page">
      {/* ── Header ── */}
      <div className="users-admin-header">
        <div className="users-admin-title-area">
          <h1 className="users-admin-title">
            <Users width="26" height="26" className="text-primary" />
            Gestión de Usuarios y Roles
          </h1>
          <p className="users-admin-subtitle">
            Administra los usuarios del sistema, asigna roles comerciales o administrativos y supervisa estados.
          </p>
        </div>

        <div className="users-admin-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              loadStats();
              loadUsers();
            }}
            disabled={loading}
          >
            <RefreshCw width="14" height="14" className={loading ? 'animate-spin' : ''} />
            Refrescar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreateModal}
          >
            <Plus width="15" height="15" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* ── KPIs Cards Grid ── */}
      <div className="users-admin-kpis">
        <div className="users-admin-kpi">
          <div className="users-admin-kpi-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Users width="22" height="22" />
          </div>
          <div className="users-admin-kpi-info">
            <span className="users-admin-kpi-label">Total Usuarios</span>
            <span className="users-admin-kpi-value">{stats ? stats.total_users : '—'}</span>
          </div>
        </div>

        <div className="users-admin-kpi">
          <div className="users-admin-kpi-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
            <ShieldCheck width="22" height="22" />
          </div>
          <div className="users-admin-kpi-info">
            <span className="users-admin-kpi-label">Administradores</span>
            <span className="users-admin-kpi-value">{stats ? stats.total_admins : '—'}</span>
          </div>
        </div>

        <div className="users-admin-kpi">
          <div className="users-admin-kpi-icon" style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold, #d4af37)' }}>
            <Store width="22" height="22" />
          </div>
          <div className="users-admin-kpi-info">
            <span className="users-admin-kpi-label">Vendedores</span>
            <span className="users-admin-kpi-value">{stats ? stats.total_sellers : '—'}</span>
          </div>
        </div>

        <div className="users-admin-kpi">
          <div className="users-admin-kpi-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <UserCheck width="22" height="22" />
          </div>
          <div className="users-admin-kpi-info">
            <span className="users-admin-kpi-label">Clientes</span>
            <span className="users-admin-kpi-value">{stats ? stats.total_clients : '—'}</span>
          </div>
        </div>

        <div className="users-admin-kpi">
          <div className="users-admin-kpi-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <AlertCircle width="22" height="22" />
          </div>
          <div className="users-admin-kpi-info">
            <span className="users-admin-kpi-label">Inactivos / Pendientes</span>
            <span className="users-admin-kpi-value">
              {stats ? stats.total_inactive + stats.total_pending_approval : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="users-admin-filters">
        <div className="users-admin-search-wrapper">
          <span className="users-admin-search-icon">
            <Search width="16" height="16" />
          </span>
          <input
            type="text"
            className="users-admin-search-input"
            placeholder="Buscar por nombre, correo o nombre de negocio..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
            >
              <X width="14" height="14" />
            </button>
          )}
        </div>

        <div className="users-admin-filter-group">
          <select
            className="users-admin-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="users-admin-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Floating Bulk Actions Bar (Visible when items selected) ── */}
      {selectedIds.length > 0 && (
        <div className="users-bulk-bar">
          <div className="users-bulk-info">
            <Layers width="18" height="18" className="text-primary" />
            <span>
              <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}
            </span>
          </div>

          <div className="users-bulk-actions">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setSelectedIds([])}
            >
              Limpiar selección
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 width="14" height="14" />
              Eliminar Selección
            </button>
          </div>
        </div>
      )}

      {/* ── Table Container ── */}
      <div className="users-admin-table-container">
        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="users-table-checkbox"
                    checked={isAllSelected && selectableUsers.length > 0}
                    onChange={handleSelectAll}
                    disabled={selectableUsers.length === 0}
                    title={isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos los visibles'}
                  />
                </th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Negocio / Marca</th>
                <th>Estado</th>
                <th>Aprobación</th>
                <th>Registro</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <Loader2 width="28" height="28" className="animate-spin text-primary" style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Cargando usuarios...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <Users width="36" height="36" style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>No se encontraron usuarios</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Prueba ajustando los filtros o el término de búsqueda.
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  const isSelf = user.id === currentUser?.id;

                  return (
                    <tr key={user.id} style={{ backgroundColor: isSelected ? 'var(--primary-50, rgba(46, 125, 50, 0.08))' : undefined }}>
                      {/* Checkbox de selección */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="users-table-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(user.id)}
                          disabled={isSelf}
                          title={isSelf ? 'No puedes seleccionar tu propia cuenta' : 'Seleccionar usuario'}
                        />
                      </td>

                      {/* Usuario */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Avatar author={user} size={38} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {user.full_name} {isSelf && <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>(Tú)</span>}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td>{renderRoleBadge(user.role)}</td>

                      {/* Negocio */}
                      <td>
                        {user.business_name ? (
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.business_name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>

                      {/* Estado Activo */}
                      <td>
                        {user.is_active ? (
                          <span className="status-badge status-badge-active">
                            <CheckCircle2 width="11" height="11" /> Activo
                          </span>
                        ) : (
                          <span className="status-badge status-badge-inactive">
                            <XCircle width="11" height="11" /> Inactivo
                          </span>
                        )}
                      </td>

                      {/* Aprobación */}
                      <td>
                        {user.is_approved ? (
                          <span className="status-badge status-badge-active">
                            <CheckCircle2 width="11" height="11" /> Aprobado
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="status-badge status-badge-pending">
                              <AlertCircle width="11" height="11" /> Pendiente
                            </span>
                            <button
                              type="button"
                              className="btn btn-xs btn-primary"
                              onClick={() => handleQuickApprove(user)}
                              title="Aprobar cuenta ahora"
                              style={{ padding: '2px 6px', fontSize: '10px' }}
                            >
                              Aprobar
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Fecha de Registro */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="users-row-actions">
                          <button
                            type="button"
                            className="btn-action-icon"
                            onClick={() => handleOpenEditModal(user)}
                            title="Editar usuario y rol"
                          >
                            <Edit2 width="15" height="15" />
                          </button>

                          <button
                            type="button"
                            className={`btn-action-icon ${user.is_active ? 'danger' : ''}`}
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                            disabled={isSelf}
                          >
                            <Power width="15" height="15" />
                          </button>

                          <button
                            type="button"
                            className="btn-action-icon danger"
                            onClick={() => handleOpenDeleteModal(user)}
                            title="Eliminar usuario"
                            disabled={isSelf}
                          >
                            <Trash2 width="15" height="15" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="users-pagination">
          <span>
            Mostrando <strong>{users.length}</strong> de <strong>{totalUsers}</strong> usuarios registrados
          </span>
          <div className="users-pagination-controls">
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft width="14" height="14" /> Anterior
            </button>
            <span>
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Siguiente <ChevronRight width="14" height="14" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Crear Nuevo Usuario ── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !savingUser && setIsCreateModalOpen(false)}
        title="Crear Nuevo Usuario"
        size="md"
        actions={[
          {
            label: 'Cancelar',
            className: 'btn-ghost',
            onClick: () => setIsCreateModalOpen(false),
            disabled: savingUser,
          },
          {
            label: savingUser ? 'Creando...' : 'Crear Usuario',
            className: 'btn-primary',
            onClick: handleCreateSubmit,
            disabled: savingUser,
          },
        ]}
      >
        <form onSubmit={handleCreateSubmit} className="admin-modal-form">
          <div className="form-grid-2">
            <div className="form-group-admin">
              <label htmlFor="create_full_name">Nombre Completo *</label>
              <div className="input-with-icon">
                <UserIcon width="16" height="16" />
                <input
                  type="text"
                  id="create_full_name"
                  className="form-input"
                  placeholder="Ej: Laura Gómez"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                  disabled={savingUser}
                />
              </div>
            </div>

            <div className="form-group-admin">
              <label htmlFor="create_email">Correo Electrónico *</label>
              <div className="input-with-icon">
                <Mail width="16" height="16" />
                <input
                  type="email"
                  id="create_email"
                  className="form-input"
                  placeholder="usuario@donapp.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={savingUser}
                />
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group-admin">
              <label htmlFor="create_password">Contraseña Inicial *</label>
              <div className="input-with-icon">
                <Lock width="16" height="16" />
                <input
                  type="password"
                  id="create_password"
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                  disabled={savingUser}
                />
              </div>
            </div>

            <div className="form-group-admin">
              <label htmlFor="create_role">Rol Asignado *</label>
              <select
                id="create_role"
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                disabled={savingUser}
              >
                <option value="client">Cliente</option>
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {formData.role === 'seller' && (
            <div className="form-group-admin">
              <label htmlFor="create_business_name">Nombre Comercial o de Negocio</label>
              <div className="input-with-icon">
                <Briefcase width="16" height="16" />
                <input
                  type="text"
                  id="create_business_name"
                  className="form-input"
                  placeholder="Ej: Estética Bella DonApp"
                  value={formData.business_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, business_name: e.target.value }))}
                  disabled={savingUser}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                disabled={savingUser}
              />
              Cuenta Activa
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={formData.is_approved}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_approved: e.target.checked }))}
                disabled={savingUser}
              />
              Cuenta Aprobada (Sin requerir código)
            </label>

            {formData.role === 'admin' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={formData.is_staff}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_staff: e.target.checked }))}
                  disabled={savingUser}
                />
                Permisos Staff
              </label>
            )}
          </div>
        </form>
      </Modal>

      {/* ── Modal: Editar Usuario & Rol ── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !savingUser && setIsEditModalOpen(false)}
        title="Editar Usuario y Rol"
        size="md"
        actions={[
          {
            label: 'Cancelar',
            className: 'btn-ghost',
            onClick: () => setIsEditModalOpen(false),
            disabled: savingUser,
          },
          {
            label: savingUser ? 'Guardando...' : 'Guardar Cambios',
            className: 'btn-primary',
            onClick: handleEditSubmit,
            disabled: savingUser,
          },
        ]}
      >
        <form onSubmit={handleEditSubmit} className="admin-modal-form">
          <div className="form-grid-2">
            <div className="form-group-admin">
              <label htmlFor="edit_full_name">Nombre Completo *</label>
              <div className="input-with-icon">
                <UserIcon width="16" height="16" />
                <input
                  type="text"
                  id="edit_full_name"
                  className="form-input"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                  disabled={savingUser}
                />
              </div>
            </div>

            <div className="form-group-admin">
              <label htmlFor="edit_email">Correo Electrónico *</label>
              <div className="input-with-icon">
                <Mail width="16" height="16" />
                <input
                  type="email"
                  id="edit_email"
                  className="form-input"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={savingUser}
                />
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group-admin">
              <label htmlFor="edit_role">Rol en el Sistema *</label>
              <select
                id="edit_role"
                className="form-select"
                value={editFormData.role}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, role: e.target.value }))}
                disabled={savingUser || targetUser?.id === currentUser?.id}
              >
                <option value="client">Cliente</option>
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
              {targetUser?.id === currentUser?.id && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                  No puedes modificar tu propio rol de administrador.
                </span>
              )}
            </div>

            <div className="form-group-admin">
              <label htmlFor="edit_password">Nueva Contraseña (Opcional)</label>
              <div className="input-with-icon">
                <KeyRound width="16" height="16" />
                <input
                  type="password"
                  id="edit_password"
                  className="form-input"
                  placeholder="Dejar en blanco para no cambiar"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={savingUser}
                />
              </div>
            </div>
          </div>

          {editFormData.role === 'seller' && (
            <div className="form-group-admin">
              <label htmlFor="edit_business_name">Nombre Comercial o de Negocio</label>
              <div className="input-with-icon">
                <Briefcase width="16" height="16" />
                <input
                  type="text"
                  id="edit_business_name"
                  className="form-input"
                  placeholder="Nombre de la marca o tienda"
                  value={editFormData.business_name}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, business_name: e.target.value }))}
                  disabled={savingUser}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                disabled={savingUser || targetUser?.id === currentUser?.id}
              />
              Cuenta Activa
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={editFormData.is_approved}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, is_approved: e.target.checked }))}
                disabled={savingUser}
              />
              Cuenta Aprobada
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={editFormData.is_staff}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, is_staff: e.target.checked }))}
                disabled={savingUser || editFormData.role === 'admin'}
              />
              Permisos Staff
            </label>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Confirmar Eliminación Individual ── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !savingUser && setIsDeleteModalOpen(false)}
        title="Eliminar o Inactivar Usuario"
        size="md"
        actions={[
          {
            label: 'Cancelar',
            className: 'btn-ghost',
            onClick: () => setIsDeleteModalOpen(false),
            disabled: savingUser,
          },
          {
            label: 'Inactivar',
            className: 'btn-warning',
            onClick: () => handleDeleteConfirm(false),
            disabled: savingUser,
          },
          {
            label: 'Eliminar Definitivamente',
            className: 'btn-danger',
            onClick: () => handleDeleteConfirm(true),
            disabled: savingUser,
          },
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            ¿Qué acción deseas realizar con la cuenta de <strong>{targetUser?.full_name}</strong> (<code>{targetUser?.email}</code>)?
          </p>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            • <strong>Inactivar:</strong> Impide el acceso del usuario sin perder su historial comercial.<br />
            • <strong>Eliminar Definitivamente:</strong> Borra la cuenta permanentemente de la base de datos.
          </div>
        </div>
      </Modal>

      {/* ── Modal: Confirmar Eliminación Masiva ── */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
        title="Acción Masiva sobre Usuarios"
        size="md"
        actions={[
          {
            label: 'Cancelar',
            className: 'btn-ghost',
            onClick: () => setIsBulkDeleteModalOpen(false),
            disabled: isBulkDeleting,
          },
          {
            label: isBulkDeleting ? 'Inactivando...' : 'Inactivar Seleccionados',
            className: 'btn-warning',
            onClick: () => handleBulkDeleteConfirm(false),
            disabled: isBulkDeleting,
          },
          {
            label: isBulkDeleting ? 'Eliminando...' : 'Eliminar Permanentemente',
            className: 'btn-danger',
            onClick: () => handleBulkDeleteConfirm(true),
            disabled: isBulkDeleting,
          },
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            Has seleccionado <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'usuario' : 'usuarios'}. Elige la acción que deseas ejecutar:
          </p>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            • <strong>Inactivar:</strong> Marca las cuentas seleccionadas como inactivas (reversible).<br />
            • <strong>Eliminar Permanentemente:</strong> Borra los usuarios y sus archivos asociados definitivamente de la base de datos.
          </div>
        </div>
      </Modal>
    </div>
  );
}
