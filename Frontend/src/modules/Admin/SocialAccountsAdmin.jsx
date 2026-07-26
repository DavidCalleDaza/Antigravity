import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Share2, Plus, Trash2, CheckCircle2, AlertCircle, Info, Loader2, Search, Users } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { adminSocialClient } from '../../utils/apiClient';
import { useStore } from '../../store/useStore';

export default function SocialAccountsAdmin() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  const toast = useToast();
  const currentUser = useStore(state => state.currentUser);

  const [activeForm, setActiveForm] = useState(null); // 'meta' | 'tiktok' | null
  const [formData, setFormData] = useState({ app_id: '', app_secret: '', access_token: '' });
  const [validating, setValidating] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [step, setStep] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedInstagramId, setSelectedInstagramId] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search || search.length < 2) {
      toast.error('Ingrese al menos 2 caracteres para buscar');
      return;
    }
    setSearching(true);
    try {
      const res = await adminSocialClient.searchUsers(search);
      setUsers(res);
    } catch (err) {
      toast.error('Error al buscar usuarios');
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setActiveForm(null);
    setLoadingAccounts(true);
    try {
      const data = await adminSocialClient.listAccounts(user.id);
      setAccounts(data);
    } catch (err) {
      toast.error('Error al cargar cuentas del usuario');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const refreshAccounts = async () => {
    if (!selectedUser) return;
    const data = await adminSocialClient.listAccounts(selectedUser.id);
    setAccounts(data);
  };

  const handleDisconnect = async (platform) => {
    try {
      await adminSocialClient.deleteAccount(selectedUser.id, platform);
      setAccounts(accounts.filter(a => a.platform !== platform));
      toast.success(`${platform} desconectado correctamente.`);
    } catch (error) {
      toast.error('No se pudo desconectar la cuenta.');
    }
  };

  const startConnect = (platformId) => {
    setActiveForm(platformId);
    setStep(1);
    setFormData({ app_id: '', app_secret: '', access_token: '' });
    setAvailableAccounts([]);
    setSelectedAccountId('');
    setSelectedInstagramId('');
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    setValidating(true);
    try {
      const res = await adminSocialClient.connectManualValidate(selectedUser.id, {
        platform_group: activeForm,
        ...formData
      });
      setAvailableAccounts(res.accounts || []);
      if (activeForm === 'tiktok' && res.accounts?.length > 0) {
        setSelectedAccountId(res.accounts[0].id);
      }
      setStep(2);
      toast.success('Credenciales validadas correctamente');
    } catch (err) {
      toast.error(err.message || 'Error al validar credenciales');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setValidating(true);
    try {
      const selected = availableAccounts.find(a => a.id === selectedAccountId);
      
      await adminSocialClient.connectManualConfirm(selectedUser.id, {
        platform_group: activeForm,
        app_id: formData.app_id,
        app_secret: formData.app_secret,
        access_token: formData.access_token,
        selected_account_id: selectedAccountId,
        selected_account_name: selected?.name || '',
        instagram_business_account_id: selectedInstagramId || undefined
      });
      
      toast.success('Cuenta conectada correctamente al usuario');
      setActiveForm(null);
      refreshAccounts();
    } catch (err) {
      toast.error(err.message || 'Error al conectar la cuenta');
    } finally {
      setValidating(false);
    }
  };

  const isConnected = (platform) => accounts.some(a => a.platform === platform);
  const getAccount = (platform) => accounts.find(a => a.platform === platform);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users width="24" height="24" />
          Admin: Cuentas Sociales de Usuarios
        </h2>
        <p className="text-secondary text-sm">Gestiona las conexiones a redes sociales en nombre de los clientes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar: Buscador */}
        <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-secondary">Buscar Negocio / Usuario</h3>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input 
              type="text" 
              className="form-input flex-1" 
              placeholder="Email o nombre" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? <Loader2 width={18} className="spin" /> : <Search width={18} />}
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {users.map(u => (
              <div 
                key={u.id} 
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'border-primary bg-primary/10' : 'border-neutral-800 hover:border-neutral-700'}`}
                onClick={() => selectUser(u)}
              >
                <div className="font-semibold text-sm">{u.full_name}</div>
                <div className="text-xs text-secondary">{u.email}</div>
                <div className="text-xs text-secondary mt-1">Rol: {u.role}</div>
              </div>
            ))}
            {users.length === 0 && !searching && search.length > 0 && (
              <div className="text-sm text-secondary text-center py-4">No se encontraron resultados</div>
            )}
          </div>
        </div>

        {/* Panel Principal: Configuración del usuario seleccionado */}
        <div className="md:col-span-2">
          {!selectedUser ? (
            <div className="bg-neutral-900 rounded-xl p-8 border border-neutral-800 flex flex-col items-center justify-center text-secondary h-full min-h-[300px]">
              <Users width={48} height={48} className="mb-4 opacity-50" />
              <p>Selecciona un usuario de la lista para gestionar sus redes.</p>
            </div>
          ) : loadingAccounts ? (
            <div className="bg-neutral-900 rounded-xl p-8 border border-neutral-800 flex items-center justify-center">
              <Loader2 width={32} height={32} className="spin text-primary" />
            </div>
          ) : (
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
              <h3 className="font-semibold text-lg mb-1">Cuentas de {selectedUser.full_name}</h3>
              <p className="text-secondary text-sm mb-6">{selectedUser.email}</p>

              <div className="social-platforms-grid">
                {/* Meta Panel */}
                <div className="social-platform-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                  <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        <div className="platform-icon-wrapper" style={{ backgroundColor: '#1877F215', color: '#1877F2', borderRadius: '50%', padding: '8px' }}>
                          <Facebook width="24" height="24" />
                        </div>
                        <div>
                          <h4 style={{ margin: 0 }}>Meta (Facebook / Instagram)</h4>
                        </div>
                      </div>
                      <div>
                        {!isConnected('facebook') && !isConnected('instagram') ? (
                          <button className="btn btn-outline btn-sm" onClick={() => startConnect('meta')}>
                            <Plus width="16" height="16" style={{ marginRight: '4px' }} /> Conectar Meta
                          </button>
                        ) : (
                          <div className="flex gap-2">
                              {isConnected('facebook') && (
                                <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDisconnect('facebook')} title="Desconectar Facebook">
                                  <Trash2 width="18" height="18" /> FB
                                </button>
                              )}
                              {isConnected('instagram') && (
                                <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDisconnect('instagram')} title="Desconectar Instagram">
                                  <Trash2 width="18" height="18" /> IG
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                  </div>

                  {(isConnected('facebook') || isConnected('instagram')) && (
                    <div className="text-sm text-secondary border-t border-neutral-700 pt-3 mt-1">
                        <div className="flex flex-col gap-2">
                          {isConnected('facebook') && (
                            <div className="flex justify-between items-center w-full">
                                <span><CheckCircle2 width={14} className="inline text-success mr-1" /> Facebook conectado</span>
                                {getAccount('facebook')?.last_modified_by && (
                                  <span className="text-xs text-primary"><Info width={12} className="inline mr-1" />Modificado por {getAccount('facebook').last_modified_by === currentUser.id ? 'ti' : 'otro staff'}</span>
                                )}
                            </div>
                          )}
                          {isConnected('instagram') && (
                            <div className="flex justify-between items-center w-full">
                                <span><CheckCircle2 width={14} className="inline text-success mr-1" /> Instagram conectado</span>
                                {getAccount('instagram')?.last_modified_by && (
                                  <span className="text-xs text-primary"><Info width={12} className="inline mr-1" />Modificado por {getAccount('instagram').last_modified_by === currentUser.id ? 'ti' : 'otro staff'}</span>
                                )}
                            </div>
                          )}
                        </div>
                    </div>
                  )}

                  {activeForm === 'meta' && (
                    <div className="bg-neutral-800 p-4 rounded-lg mt-2">
                      {step === 1 ? (
                        <form onSubmit={handleValidate} className="flex flex-col gap-3">
                            <input required type="text" className="form-input" placeholder="App ID" value={formData.app_id} onChange={e => setFormData({...formData, app_id: e.target.value})} />
                            <input required type="password" className="form-input" placeholder="App Secret" value={formData.app_secret} onChange={e => setFormData({...formData, app_secret: e.target.value})} />
                            <input required type="password" className="form-input" placeholder="Access Token (Page Token)" value={formData.access_token} onChange={e => setFormData({...formData, access_token: e.target.value})} />
                            <div className="flex justify-end gap-2 mt-2">
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveForm(null)}>Cancelar</button>
                              <button type="submit" className="btn btn-primary btn-sm" disabled={validating}>
                                {validating ? <Loader2 className="spin" width={16} /> : 'Validar'}
                              </button>
                            </div>
                        </form>
                      ) : (
                        <form onSubmit={handleConfirm} className="flex flex-col gap-3">
                            <label className="text-sm font-semibold">Selecciona la Página</label>
                            <select required className="form-input" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                              <option value="">Seleccione...</option>
                              {availableAccounts.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>

                            {selectedAccountId && availableAccounts.find(a => a.id === selectedAccountId)?.instagram_business_account && (
                              <div className="flex items-center gap-2 mt-2">
                                  <input type="checkbox" id="link_ig_admin" checked={!!selectedInstagramId} onChange={(e) => setSelectedInstagramId(e.target.checked ? availableAccounts.find(a => a.id === selectedAccountId).instagram_business_account.id : '')} />
                                  <label htmlFor="link_ig_admin" className="text-sm">Vincular cuenta de Instagram asociada</label>
                              </div>
                            )}
                            <div className="flex justify-end gap-2 mt-2">
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Atrás</button>
                              <button type="submit" className="btn btn-primary btn-sm" disabled={validating || !selectedAccountId}>
                                {validating ? <Loader2 className="spin" width={16} /> : 'Conectar al usuario'}
                              </button>
                            </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* TikTok Panel */}
                <div className="social-platform-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch', marginTop: '1rem' }}>
                  <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        <div className="platform-icon-wrapper" style={{ backgroundColor: '#00000015', color: '#000000', borderRadius: '50%', padding: '8px' }}>
                          <Share2 width="24" height="24" />
                        </div>
                        <div>
                          <h4 style={{ margin: 0 }}>TikTok</h4>
                        </div>
                      </div>
                      <div>
                        {!isConnected('tiktok') ? (
                          <button className="btn btn-outline btn-sm" onClick={() => startConnect('tiktok')}>
                            <Plus width="16" height="16" style={{ marginRight: '4px' }} /> Conectar
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDisconnect('tiktok')} title="Desconectar TikTok">
                            <Trash2 width="18" height="18" /> Desconectar
                          </button>
                        )}
                      </div>
                  </div>

                  {isConnected('tiktok') && (
                    <div className="text-sm text-secondary border-t border-neutral-700 pt-3 mt-1 flex flex-col gap-2">
                        <div className="flex justify-between items-center w-full">
                          <span><CheckCircle2 width={14} className="inline text-success mr-1" /> Conectado</span>
                          {getAccount('tiktok')?.last_modified_by && (
                              <span className="text-xs text-primary"><Info width={12} className="inline mr-1" />Modificado por {getAccount('tiktok').last_modified_by === currentUser.id ? 'ti' : 'otro staff'}</span>
                          )}
                        </div>
                    </div>
                  )}

                  {activeForm === 'tiktok' && (
                    <div className="bg-neutral-800 p-4 rounded-lg mt-2">
                      {step === 1 ? (
                        <form onSubmit={handleValidate} className="flex flex-col gap-3">
                            <input required type="text" className="form-input" placeholder="Client Key (App ID)" value={formData.app_id} onChange={e => setFormData({...formData, app_id: e.target.value})} />
                            <input required type="password" className="form-input" placeholder="Client Secret" value={formData.app_secret} onChange={e => setFormData({...formData, app_secret: e.target.value})} />
                            <input required type="password" className="form-input" placeholder="Access Token" value={formData.access_token} onChange={e => setFormData({...formData, access_token: e.target.value})} />
                            <div className="flex justify-end gap-2 mt-2">
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveForm(null)}>Cancelar</button>
                              <button type="submit" className="btn btn-primary btn-sm" disabled={validating}>
                                {validating ? <Loader2 className="spin" width={16} /> : 'Validar'}
                              </button>
                            </div>
                        </form>
                      ) : (
                        <form onSubmit={handleConfirm} className="flex flex-col gap-3">
                            <div className="text-sm">
                              Se ha detectado la cuenta: <strong>{availableAccounts[0]?.name}</strong>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Atrás</button>
                              <button type="submit" className="btn btn-primary btn-sm" disabled={validating} onClick={() => setSelectedAccountId(availableAccounts[0]?.id)}>
                                {validating ? <Loader2 className="spin" width={16} /> : 'Conectar al usuario'}
                              </button>
                            </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
