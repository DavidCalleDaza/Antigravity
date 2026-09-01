import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Info, Loader2, Star, AlertTriangle, XCircle, Eye, EyeOff, Lock, RefreshCw, Sparkles, Pencil } from 'lucide-react';
import { MetaBrandIcon, TikTokBrandIcon, FacebookBrandIcon, InstagramBrandIcon } from '../../components/ui/SocialBrandIcons';
import { useToast } from '../../components/ui/Toast';
import { socialClient } from '../../utils/apiClient';
import { useStore } from '../../store/useStore';

const PLATFORM_LABELS = {
  meta: { appId: 'App ID', appSecret: 'App Secret', accessToken: 'Access Token (Page Token)' },
  tiktok: { appId: 'Client Key (App ID)', appSecret: 'Client Secret', accessToken: 'Access Token' },
};

const REGEN_LINKS = {
  facebook: 'https://developers.facebook.com/tools/explorer/',
  instagram: 'https://developers.facebook.com/tools/explorer/',
};

export default function SocialSettings() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const currentUser = useStore(state => state.currentUser);

  const [activeForm, setActiveForm] = useState(null); // 'meta' | 'tiktok' | null
  const [formData, setFormData] = useState({ app_id: '', app_secret: '', access_token: '' });
  const [validating, setValidating] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [step, setStep] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedInstagramId, setSelectedInstagramId] = useState('');

  // ── Credential lock / reveal state ──────────────────────────────────────
  const [savedCred, setSavedCred] = useState({ app_id: null, has_credential: false });
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showRevealPrompt, setShowRevealPrompt] = useState(false);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [secretVisible, setSecretVisible] = useState(false);

  // ── Per-account edit / detail state ─────────────────────────────────────
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState('personal');
  const [editToken, setEditToken] = useState('');
  const [showEditToken, setShowEditToken] = useState(false);
  const [expandedAccountId, setExpandedAccountId] = useState(null);

  useEffect(() => {
    fetchAccounts();
    socialClient.reconcileTikTokPosts?.().catch(() => {}); // best-effort, no bloquea la UI
  }, []);

  useEffect(() => {
    if (!revealedSecret) return;
    const t = setTimeout(() => {
      setRevealedSecret(null);
      setSecretVisible(false);
    }, 20000);
    return () => clearTimeout(t);
  }, [revealedSecret]);

  const fetchAccounts = async () => {
    try {
      const data = await socialClient.listAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectById = async (accountId) => {
    try {
      await socialClient.deleteAccountById(accountId);
      setAccounts(accounts.filter(a => a.id !== accountId));
      toast.success('Cuenta desconectada correctamente.', 'Éxito');
    } catch (error) {
      toast.error('No se pudo desconectar la cuenta.', 'Error');
    }
  };

  const handleMakeDefault = async (accountId) => {
    try {
      await socialClient.updateAccount(accountId, { is_default: true });
      fetchAccounts();
      toast.success('Cuenta marcada como predeterminada.');
    } catch (error) {
      toast.error('Error al actualizar cuenta predeterminada.');
    }
  };

  const startEditAccount = (account) => {
    setEditingAccountId(account.id);
    setEditLabel(account.display_label || account.platform_username || account.platform_user_id || '');
    setEditType(account.account_type || 'personal');
    setEditToken('');
    setShowEditToken(false);
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
  };

  const handleSaveEdit = async (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    try {
      if (account && (editLabel !== account.display_label || editType !== account.account_type)) {
        await socialClient.updateAccount(accountId, { display_label: editLabel, account_type: editType });
      }
      if (editToken.trim()) {
        await socialClient.renewAccountToken(accountId, editToken.trim());
      }
      toast.success('Cuenta actualizada correctamente.');
      setEditingAccountId(null);
      fetchAccounts();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar la cuenta.', 'Error');
    }
  };

  const toggleDetail = (accountId) => {
    setExpandedAccountId(prev => (prev === accountId ? null : accountId));
  };

  const formatDateTime = (value) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleString();
    } catch {
      return null;
    }
  };

  const maskPlatformId = (id) => (id ? `••••••${id.slice(-6)}` : '—');

  const startConnect = async (platformId) => {
    setActiveForm(platformId);
    setStep(1);
    setAvailableAccounts([]);
    setSelectedAccountId('');
    setSelectedInstagramId('');
    setFormData({ app_id: '', app_secret: '', access_token: '' });
    setEditingCredentials(false);
    setShowAccessToken(false);
    setShowRevealPrompt(false);
    setRevealPassword('');
    setRevealedSecret(null);
    setSecretVisible(false);
    setSavedCred({ app_id: null, has_credential: false });

    try {
      const cred = await socialClient.getAppCredentials(platformId);
      setSavedCred(cred);
      if (cred.has_credential) {
        setFormData(prev => ({ ...prev, app_id: cred.app_id || '' }));
      }
    } catch (err) {
      // No hay credenciales guardadas todavía — se queda en modo "primera vez"
      setSavedCred({ app_id: null, has_credential: false });
    }
  };

  const handleEditCredentials = () => {
    setEditingCredentials(true);
    setRevealedSecret(null);
    setSecretVisible(false);
    setFormData(prev => ({ ...prev, app_secret: '' }));
  };

  const handleRevealSecret = async () => {
    if (!revealPassword) return;
    setRevealLoading(true);
    try {
      const data = await socialClient.revealAppCredentials(activeForm, revealPassword);
      setRevealedSecret(data.app_secret);
      setSecretVisible(true);
      setShowRevealPrompt(false);
      setRevealPassword('');
    } catch (err) {
      toast.error('Contraseña incorrecta.', 'Error');
    } finally {
      setRevealLoading(false);
    }
  };

  const toggleSecretVisibility = () => {
    if (revealedSecret) {
      setSecretVisible(v => !v);
    } else {
      setShowRevealPrompt(v => !v);
    }
  };

  const usingSavedCredential = savedCred.has_credential && !editingCredentials;

  const handleValidate = async (e) => {
    e.preventDefault();
    setValidating(true);
    try {
      const res = await socialClient.connectManualValidate({
        platform_group: activeForm,
        app_id: formData.app_id,
        app_secret: usingSavedCredential ? undefined : formData.app_secret,
        access_token: formData.access_token,
      });
      setAvailableAccounts(res.accounts || []);
      if (activeForm === 'tiktok' && res.accounts?.length > 0) {
        setSelectedAccountId(res.accounts[0].id);
      } else if (activeForm === 'meta') {
        const fetchedAccounts = res.accounts || [];
        const alreadyConnectedPage = fetchedAccounts.find(a =>
          accounts.some(existing => existing.platform === 'facebook' && existing.platform_user_id === a.id)
        );
        if (alreadyConnectedPage) {
          setSelectedAccountId(alreadyConnectedPage.id);
          const igBiz = alreadyConnectedPage.instagram_business_account;
          if (igBiz && accounts.some(existing => existing.platform === 'instagram' && existing.platform_user_id === igBiz.id)) {
            setSelectedInstagramId(igBiz.id);
          }
        }
      }
      setStep(2);
      toast.success('Credenciales validadas correctamente');
    } catch (err) {
      toast.error(err.message || 'Error al validar credenciales', 'Error');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setValidating(true);
    try {
      const selected = availableAccounts.find(a => a.id === selectedAccountId);

      await socialClient.connectManualConfirm({
        platform_group: activeForm,
        app_id: formData.app_id,
        app_secret: usingSavedCredential ? undefined : formData.app_secret,
        access_token: formData.access_token,
        selected_account_id: selectedAccountId,
        selected_account_name: selected?.name || '',
        instagram_business_account_id: selectedInstagramId || undefined,
        instagram_username: selectedInstagramId ? selected?.instagram_business_account?.username : undefined,
        account_type: activeForm === 'meta' ? 'business' : 'personal'
      });

      toast.success('Cuenta conectada correctamente');
      setActiveForm(null);
      fetchAccounts();
    } catch (err) {
      toast.error(err.message || 'Error al conectar la cuenta', 'Error');
    } finally {
      setValidating(false);
    }
  };

  const renderStatusRow = (account) => {
    const dotClass = account.status === 'active' ? 'active' : (account.status === 'expired' ? 'expired' : 'error');
    const label = account.status === 'active' ? 'Activa' : (account.status === 'expired' ? 'Expirada' : (account.status === 'revoked' ? 'Revocada' : 'Error'));
    return (
      <div className="sns-status-row">
        <span className={`sns-status-dot ${dotClass}`} />
        <span>{label}</span>
        <span>·</span>
        <span>Añadida {new Date(account.created_at).toLocaleDateString()}</span>
        {account.last_modified_by && account.last_modified_by !== currentUser?.id && (
          <span className="text-primary" title="Modificado por soporte"><Info width={11} className="inline mr-1" />Soporte</span>
        )}
      </div>
    );
  };

  const renderAccountList = (platformFilter) => {
    const platformAccounts = accounts.filter(a => platformFilter.includes(a.platform));
    if (platformAccounts.length === 0) {
      return <p className="sns-empty-hint">Todavía no has conectado ninguna cuenta.</p>;
    }

    return (
      <div className="sns-accounts">
        {platformAccounts.map(account => (
          <div key={account.id} className="sns-account-chip">
            <div className="sns-account-main">
              <div className="sns-account-avatar">
                {account.platform === 'facebook' && <FacebookBrandIcon size={18} />}
                {account.platform === 'instagram' && <InstagramBrandIcon size={18} />}
                {account.platform === 'tiktok' && <TikTokBrandIcon size={18} />}
              </div>
              <div className="sns-account-info">
                <div className="sns-account-name-row">
                  {editingAccountId === account.id ? (
                    <>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={account.display_label || account.platform_username || account.platform_user_id || 'Nombre'}
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                      />
                      <select className="form-input" value={editType} onChange={e => setEditType(e.target.value)}>
                        <option value="personal">Personal</option>
                        <option value="business">Business</option>
                      </select>
                    </>
                  ) : (
                    <span className="sns-account-name">{account.display_label || account.platform_username || account.platform_user_id}</span>
                  )}
                  <span className={`sns-badge ${account.account_type === 'business' ? 'business' : 'personal'}`}>
                    {account.account_type === 'business' ? 'Business' : 'Personal'}
                  </span>
                  {account.is_default && (
                    <span className="sns-badge default"><Star width={9} /> Default</span>
                  )}
                </div>
                {renderStatusRow(account)}
                {account.last_error && <div className="sns-error-text">{account.last_error}</div>}
                {editingAccountId === account.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', maxWidth: '420px' }}>
                    <div>
                      <label className="sns-field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Access Token (opcional)</span>
                        {(account.platform === 'facebook' || account.platform === 'instagram') && (
                          <a href={REGEN_LINKS[account.platform]} target="_blank" rel="noopener noreferrer" className="sns-regen-btn">
                            <RefreshCw width={11} /> Generar token en Graph API Explorer
                          </a>
                        )}
                      </label>
                      <div className="sns-input-wrapper">
                        <input
                          type={showEditToken ? 'text' : 'password'}
                          className="form-input"
                          placeholder="Dejar en blanco para no cambiar"
                          value={editToken}
                          onChange={e => setEditToken(e.target.value)}
                        />
                        <button type="button" className="sns-input-eye" onClick={() => setShowEditToken(v => !v)}>
                          {showEditToken ? <EyeOff width={16} /> : <Eye width={16} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(account.id)}>
                        Guardar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelEditAccount}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="sns-account-actions">
              {account.status === 'expired' && REGEN_LINKS[account.platform] && (
                <a href={REGEN_LINKS[account.platform]} target="_blank" rel="noopener noreferrer" className="sns-regen-btn">
                  <RefreshCw width={11} /> Regenerar token
                </a>
              )}
              <button className="sns-icon-btn" onClick={() => toggleDetail(account.id)} title="Ver detalles">
                <Info width={15} height={15} />
              </button>
              <button className="sns-icon-btn" onClick={() => startEditAccount(account)} title="Editar cuenta">
                <Pencil width={15} height={15} />
              </button>
              {!account.is_default && (
                <button className="sns-icon-btn" onClick={() => handleMakeDefault(account.id)} title="Hacer predeterminada">
                  <Star width={15} height={15} />
                </button>
              )}
              <button className="sns-icon-btn danger" onClick={() => handleDisconnectById(account.id)} title="Desconectar cuenta">
                <Trash2 width={16} height={16} />
              </button>
            </div>
            {expandedAccountId === account.id && (
              <div className="sns-account-detail" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border, #e5e7eb)', fontSize: '13px', display: 'grid', gap: '4px' }}>
                <div><strong>Método de conexión:</strong> {account.connection_method === 'manual' ? 'Manual' : 'OAuth'}</div>
                <div><strong>ID de plataforma:</strong> {maskPlatformId(account.platform_user_id)}</div>
                <div><strong>Última verificación:</strong> {formatDateTime(account.last_verified_at) || 'Nunca'}</div>
                <div><strong>Token expira:</strong> {formatDateTime(account.token_expires_at) || 'No disponible'}</div>
                <div><strong>Conectada el:</strong> {formatDateTime(account.created_at)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCredentialForm = () => {
    const labels = PLATFORM_LABELS[activeForm] || PLATFORM_LABELS.meta;

    return (
      <form onSubmit={handleValidate} className="flex flex-col gap-3">
        {usingSavedCredential ? (
          <>
            <div>
              <label className="sns-field-label"><Lock width={11} /> {labels.appId}</label>
              <div className="sns-locked-field plain">{formData.app_id}</div>
            </div>
            <div>
              <label className="sns-field-label"><Lock width={11} /> {labels.appSecret}</label>
              <div className="sns-locked-field">
                <span>{revealedSecret && secretVisible ? revealedSecret : '••••••••••••••••••'}</span>
                <button type="button" className="sns-eye-btn" onClick={toggleSecretVisibility}>
                  {revealedSecret && secretVisible ? <EyeOff width={15} /> : <Eye width={15} />}
                </button>
              </div>
              {showRevealPrompt && (
                <div className="sns-reveal-popover">
                  <p className="text-xs text-secondary" style={{ margin: 0 }}>Ingresa tu contraseña de cuenta para ver el {labels.appSecret}</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Tu contraseña"
                      value={revealPassword}
                      onChange={e => setRevealPassword(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleRevealSecret} disabled={revealLoading}>
                      {revealLoading ? <Loader2 className="spin" width={14} /> : 'Ver'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="sns-edit-creds-link" onClick={handleEditCredentials}>
              ¿Necesitas cambiar el {labels.appId} o {labels.appSecret}? Editar credenciales guardadas
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="sns-field-label">{labels.appId}</label>
              <input required type="text" className="form-input" placeholder={labels.appId} value={formData.app_id} onChange={e => setFormData({ ...formData, app_id: e.target.value })} />
            </div>
            <div>
              <label className="sns-field-label">{labels.appSecret}</label>
              <input required type="password" className="form-input" placeholder={labels.appSecret} value={formData.app_secret} onChange={e => setFormData({ ...formData, app_secret: e.target.value })} />
            </div>
          </>
        )}

        <div>
          <label className="sns-field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{labels.accessToken}</span>
            {activeForm === 'meta' && (
              <a href={REGEN_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="sns-regen-btn">
                <RefreshCw width={11} /> Generar token en Graph API Explorer
              </a>
            )}
          </label>
          <div className="sns-input-wrapper">
            <input
              required
              type={showAccessToken ? 'text' : 'password'}
              className="form-input"
              placeholder={labels.accessToken}
              value={formData.access_token}
              onChange={e => setFormData({ ...formData, access_token: e.target.value })}
            />
            <button type="button" className="sns-input-eye" onClick={() => setShowAccessToken(v => !v)}>
              {showAccessToken ? <EyeOff width={16} /> : <Eye width={16} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveForm(null)}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={validating}>
            {validating ? <Loader2 className="spin" width={16} /> : 'Validar'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="sns-wrapper">
      <div className="sns-hero">
        <div className="sns-hero-icon"><Sparkles width={22} height={22} /></div>
        <div className="sns-hero-text">
          <h4>Gestión de Redes Sociales</h4>
          <p>
            Conecta todas tus páginas de Facebook, perfiles de Instagram y cuentas de TikTok.
            Selecciona una cuenta como predeterminada por plataforma para agilizar tus publicaciones.
          </p>
        </div>
      </div>

      <div className="sns-grid">
        {/* ── Meta ── */}
        <div className="sns-card sns-card--meta">
          <div className="sns-card-header">
            <div className="sns-card-title">
              <div className="sns-card-icon sns-platform-icon meta"><MetaBrandIcon size={28} /></div>
              <div>
                <h4>Meta</h4>
                <span>Facebook &amp; Instagram</span>
              </div>
            </div>
            <button className="sns-add-btn" onClick={() => startConnect('meta')}>
              <Plus width={14} height={14} /> Agregar cuenta
            </button>
          </div>

          {renderAccountList(['facebook', 'instagram'])}

          {activeForm === 'meta' && (
            <div className="sns-form-panel">
              <div className="sns-steps">
                <span className={`sns-step-dot ${step === 1 ? 'active' : ''}`} />
                <span className="sns-step-line" />
                <span className={`sns-step-dot ${step === 2 ? 'active' : ''}`} />
              </div>

              {step === 1 ? renderCredentialForm() : (
                <form onSubmit={handleConfirm} className="flex flex-col gap-3">
                  <label className="sns-field-label">Selecciona la Página de Facebook</label>
                  <select required className="form-input" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {availableAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>

                  {selectedAccountId && availableAccounts.find(a => a.id === selectedAccountId)?.instagram_business_account && (
                    <>
                      <label className="sns-field-label mt-2">Cuenta de Instagram detectada</label>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="link_ig" checked={!!selectedInstagramId} onChange={(e) => setSelectedInstagramId(e.target.checked ? availableAccounts.find(a => a.id === selectedAccountId).instagram_business_account.id : '')} />
                        <label htmlFor="link_ig" className="text-sm">Vincular cuenta de Instagram asociada</label>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Atrás</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={validating || !selectedAccountId}>
                      {validating ? <Loader2 className="spin" width={16} /> : 'Conectar cuenta'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── TikTok ── */}
        <div className="sns-card sns-card--tiktok">
          <div className="sns-card-header">
            <div className="sns-card-title">
              <div className="sns-card-icon sns-platform-icon tiktok"><TikTokBrandIcon size={28} /></div>
              <div>
                <h4>TikTok</h4>
                <span>Cuentas de creador</span>
              </div>
            </div>
            <button className="sns-add-btn" onClick={() => startConnect('tiktok')}>
              <Plus width={14} height={14} /> Agregar cuenta
            </button>
          </div>

          {renderAccountList(['tiktok'])}

          {activeForm === 'tiktok' && (
            <div className="sns-form-panel">
              <div className="sns-steps">
                <span className={`sns-step-dot ${step === 1 ? 'active' : ''}`} />
                <span className="sns-step-line" />
                <span className={`sns-step-dot ${step === 2 ? 'active' : ''}`} />
              </div>

              {step === 1 ? renderCredentialForm() : (
                <form onSubmit={handleConfirm} className="flex flex-col gap-3">
                  <div className="text-sm">
                    Se ha detectado la cuenta: <strong>{availableAccounts[0]?.name}</strong>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Atrás</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={validating}>
                      {validating ? <Loader2 className="spin" width={16} /> : 'Conectar cuenta'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
