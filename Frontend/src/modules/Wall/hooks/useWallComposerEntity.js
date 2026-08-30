import { useState, useEffect, useRef, useCallback } from 'react';
import { productClient, serviceClient, categoryClient } from '../../../utils/apiClient';
import { useFileUpload } from '../../../hooks/useFileUpload';

const EMPTY_FORM = {
  name: '',
  category_id: '',
  price: '',
  stock: '',
  duration: '',
  status: 'active',
  description: '',
  image_url: '',
};

function clientFor(kind) {
  return kind === 'service' ? serviceClient : productClient;
}

function buildPayload(formData, kind) {
  const payload = {
    name: formData.name?.trim(),
    category_id: formData.category_id || null,
    price: formData.price === '' ? 0 : Number(formData.price),
    status: formData.status || 'active',
    description: formData.description || '',
    image_url: formData.image_url || null,
  };
  if (kind === 'service') {
    payload.duration = formData.duration || '';
  } else {
    payload.stock = formData.stock === '' ? 0 : Number(formData.stock);
  }
  return payload;
}

export function useWallComposerEntity({ toast }) {
  const [entityKind, setEntityKind] = useState(null); // 'product' | 'service' | null
  const [entityMode, setEntityMode] = useState('create'); // 'create' | 'edit'
  const [entityFormData, setEntityFormData] = useState(EMPTY_FORM);
  const [dbCategories, setDbCategories] = useState([]);
  const [entityMediaError, setEntityMediaError] = useState('');
  const [linkedItem, setLinkedItem] = useState(null); // { id, kind, name, image_url }
  const [linkQuery, setLinkQuery] = useState('');
  const [linkOptions, setLinkOptions] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSearchActive, setLinkSearchActive] = useState(false);

  const originalSnapshotRef = useRef(null);

  const {
    upload: entityUpload,
    validateFile: entityValidateFile,
    reset: entityReset,
    uploading: entityUploading,
    compressing: entityCompressing,
    progress: entityProgress,
    preview: entityPreview,
  } = useFileUpload({
    onSuccess: (data) => {
      setEntityFormData((prev) => ({ ...prev, image_url: data.url }));
    },
    onError: (err) => {
      setEntityMediaError(err);
    },
  });

  const setEntityField = useCallback((field, value) => {
    setEntityFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleEntityFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEntityMediaError('');
    const validation = entityValidateFile(file);
    if (!validation.valid) {
      setEntityMediaError(validation.error);
      return;
    }
    entityUpload(file);
  };

  const handleEntityMediaClear = () => {
    entityReset();
    setEntityFormData((prev) => ({ ...prev, image_url: '' }));
  };

  const resetEntity = useCallback(() => {
    setEntityMode('create');
    setEntityKind(null);
    setEntityFormData(EMPTY_FORM);
    originalSnapshotRef.current = null;
    handleEntityMediaClear();
    setLinkedItem(null);
    setLinkQuery('');
    setLinkOptions([]);
    setLinkSearchActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadCategories = useCallback(async () => {
    if (!entityKind) return;
    try {
      const cats = await categoryClient.list(entityKind);
      setDbCategories(cats);
    } catch (err) {
      setDbCategories([]);
    }
  }, [entityKind]);

  // Carga los datos completos del producto/servicio vinculado por el buscador
  useEffect(() => {
    let cancelled = false;

    if (!linkedItem) {
      setEntityMode('create');
      setEntityKind(null);
      setEntityFormData(EMPTY_FORM);
      originalSnapshotRef.current = null;
      handleEntityMediaClear();
      return;
    }

    (async () => {
      try {
        const data = await clientFor(linkedItem.kind).get(linkedItem.id);
        if (cancelled) return;
        const loaded = {
          name: data.name || '',
          category_id: data.category_id || '',
          price: data.price ?? '',
          stock: data.stock ?? '',
          duration: data.duration ?? '',
          status: data.status || 'active',
          description: data.description || '',
          image_url: data.image_url || '',
        };
        setEntityFormData(loaded);
        originalSnapshotRef.current = loaded;
        setEntityKind(linkedItem.kind);
        setEntityMode('edit');
      } catch (err) {
        if (!cancelled) toast.error('No se pudo cargar la información vinculada.');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedItem]);

  // Recarga las categorías del tipo de entidad activo
  useEffect(() => {
    if (!entityKind) {
      setDbCategories([]);
      return;
    }
    categoryClient
      .list(entityKind)
      .then(setDbCategories)
      .catch(() => setDbCategories([]));
  }, [entityKind]);

  // Debounce 350ms sobre productClient.list() + serviceClient.list()
  useEffect(() => {
    if (!linkSearchActive) return;
    const timer = setTimeout(async () => {
      try {
        setLinkLoading(true);
        const params = { limit: 20 };
        if (linkQuery.trim()) params.search = linkQuery.trim();
        const [products, services] = await Promise.all([
          productClient.list(params),
          serviceClient.list(params),
        ]);
        const toOption = (item, kind) => ({
          id: item.id,
          kind,
          name: item.name,
          image_url: item.image_url || item.imageUrl,
          price: item.price,
          status: item.status,
        });
        const merged = [];
        (Array.isArray(products) ? products : []).forEach((p) => merged.push(toOption(p, 'product')));
        (Array.isArray(services) ? services : []).forEach((s) => merged.push(toOption(s, 'service')));

        setLinkOptions(merged);
      } catch (err) {
        setLinkOptions([]);
      } finally {
        setLinkLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [linkSearchActive, linkQuery]);

  const resolveEntityId = useCallback(async () => {
    if (entityMode === 'edit' && linkedItem) {
      const original = originalSnapshotRef.current;
      const changed =
        !original ||
        Object.keys(original).some(
          (key) => String(entityFormData[key] ?? '') !== String(original[key] ?? '')
        );
      if (changed) {
        try {
          const payload = buildPayload(entityFormData, linkedItem.kind);
          await clientFor(linkedItem.kind).update(linkedItem.id, payload);
        } catch (err) {
          toast.error('No se pudieron guardar los cambios del vínculo.');
        }
      }
      return { id: linkedItem.id, kind: linkedItem.kind };
    }

    if (entityMode === 'create' && entityFormData.name?.trim()) {
      const kind = entityKind || 'product';
      try {
        const payload = buildPayload(entityFormData, kind);
        const created = await clientFor(kind).create(payload);
        return { id: created.id, kind };
      } catch (err) {
        toast.error('No se pudo crear el producto/servicio.');
        return null;
      }
    }

    return null;
  }, [entityMode, entityFormData, entityKind, linkedItem, toast]);

  return {
    entityKind,
    setEntityKind,
    entityMode,
    entityFormData,
    setEntityField,
    dbCategories,
    reloadCategories,
    entityMediaError,
    entityPreview,
    entityUploading,
    entityCompressing,
    entityProgress,
    handleEntityFileSelect,
    handleEntityMediaClear,
    linkedItem,
    setLinkedItem,
    linkQuery,
    setLinkQuery,
    linkOptions,
    linkLoading,
    linkSearchActive,
    setLinkSearchActive,
    resolveEntityId,
    resetEntity,
  };
}
