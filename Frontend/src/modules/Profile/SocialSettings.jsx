import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Share2, Plus, Trash2, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { socialClient } from '../../utils/apiClient';
import { useStore } from '../../store/useStore';

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

  useEffect(() => {
    fetchAccounts();
  }, []);

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

  const handleDisconnect = async (platform) => {
    try {
      await socialClient.deleteAccount(platform);
      setAccounts(accounts.filter(a => a.platform !== platform));
      toast.success(`${platform} desconectado correctamente.`, 'Éxito');
    } catch (error) {
      toast.error('No se pudo desconectar la cuenta.', 'Error');
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
      const res = await socialClient.connectManualValidate({
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
        app_secret: formData.app_secret,
        access_token: formData.access_token,
        selected_account_id: selectedAccountId,
        selected_account_name: selected?.name || '',
        instagram_business_account_id: selectedInstagramId || undefined
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

  const isConnected = (platform) => accounts.some(a => a.platform === platform);
  const getAccount = (platform) => accounts.find(a => a.platform === platform);

  return (
    <div className="social-settings">
      <div className="section-header">
        <Share2 width="20" height="20" />
        <h3>Gestión de Redes Sociales</h3>
      </div>
      
      <div className="social-info-banner mb-8 p-4 rounded-xl border border-primary-subtle bg-primary-subtle/10 flex gap-3">
        <AlertCircle className="text-primary shrink-0" width="20" height="20" />
        <p className="text-sm text-secondary">
          <strong>Modo Desarrollador Activo:</strong> Servinow se encuentra en fase de desarrollo para integraciones sociales. 
          Para conectar tus cuentas y publicar desde Productos/Servicios, debes generar un Token de Acceso desde el portal de 
          <strong> Meta for Developers</strong> o <strong>TikTok for Developers</strong> y pegarlo aquí, junto con las credenciales de tu App.
        </p>
      </div>

      <div className="social-platforms-grid">
        {/* Render Meta Group */}
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
                        {getAccount('facebook')?.last_modified_by && getAccount('facebook').last_modified_by !== currentUser?.id && (
                           <span className="text-xs text-primary"><Info width={12} className="inline mr-1" />Modificado por soporte</span>
                        )}
                     </div>
                  )}
                  {isConnected('instagram') && (
                     <div className="flex justify-between items-center w-full">
                        <span><CheckCircle2 width={14} className="inline text-success mr-1" /> Instagram conectado</span>
                        {getAccount('instagram')?.last_modified_by && getAccount('instagram').last_modified_by !== currentUser?.id && (
                           <span className="text-xs text-primary"><Info width={12} className="inline mr-1" />Modificado por soporte</span>
                        )}
                     </div>
                  )}
                  <div className="text-xs opacity-70 mt-1">
                    Token guardado: •••••••••••••••
                  </div>
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
                    <label className="text-sm font-semibold">Selecciona la Página de Facebook</label>
                    <select required className="form-input" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                      <option value="">Seleccione...</option>
                      {availableAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>

                    {selectedAccountId && availableAccounts.find(a => a.id === selectedAccountId)?.instagram_business_account && (
                      <>
                        <label className="text-sm font-semibold mt-2">Cuenta de Instagram detectada</label>
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

        {/* Render TikTok Group */}
        <div className="social-platform-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
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
                   {getAccount('tiktok')?.last_modified_by && getAccount('tiktok').last_modified_by !== currentUser?.id && (
                       <span className="text-xs text-primary"><Info width={12} className="inline mr-1" />Modificado por soporte</span>
                   )}
                </div>
                <div className="text-xs opacity-70 mt-1">
                    Token guardado: •••••••••••••••
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
