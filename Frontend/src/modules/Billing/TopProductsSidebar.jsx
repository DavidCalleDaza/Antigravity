import React, { useState, useEffect } from 'react';
import { TrendingUp, Package } from 'lucide-react';
// Cambiamos al cliente correcto que tiene definida la función 'getTopSelling'
import { billingClient } from '../../utils/apiClient';
import Helpers from '../../utils/helpers';

/**
 * Sidebar con el top de productos/servicios más vendidos.
 * Se actualiza automáticamente cuando cambian dateFrom / dateTo,
 * para que respete los mismos filtros de fecha que el listado de facturas.
 */
export default function TopProductsSidebar({ dateFrom, dateTo, limit = 5, refreshTrigger }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTopProducts = async () => {
      setLoading(true);
      setError(false);
      try {
        const params = { limit };
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        const data = await billingClient.getTopSelling(params);

        if (!cancelled) {
          const combined = [
            ...(data?.products || []),
            ...(data?.services || [])
          ];
          combined.sort((a, b) => Number(b.total_quantity) - Number(a.total_quantity));
          setProducts(combined.slice(0, limit));
        }
      } catch (err) {
        console.error('Error al cargar productos más vendidos:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTopProducts();
    return () => { cancelled = true; };
    // Añadimos refreshTrigger aquí
  }, [dateFrom, dateTo, limit, refreshTrigger]);
    
  const maxQuantity = products.length > 0
    ? Math.max(...products.map(p => Number(p.total_quantity) || 0))
    : 0;
        
  return (
    <div className="card top-products-sidebar">
      <div className="card-header top-products-header">
        <h3 className="card-title">
          <TrendingUp width="16" height="16" className="top-products-icon" />
          Más Vendidos
        </h3>
      </div>

      <div className="card-body top-products-body">
        {loading && (
          <div className="top-products-loading">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="top-products-skeleton animate-pulse" style={{ height: '50px', marginBottom: '8px', background: '#e2e8f0', borderRadius: '4px' }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="top-products-empty">
            <Package width="28" height="28" className="text-muted" />
            <span className="text-muted small">No se pudo cargar el ranking.</span>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="top-products-empty">
            <Package width="28" height="28" className="text-muted" />
            <span className="text-muted small">Sin ventas registradas aún.</span>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <ol className="top-products-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {products.map((p, idx) => {
              const barWidth = maxQuantity > 0
                ? Math.max(6, Math.round((Number(p.total_quantity) / maxQuantity) * 100))
                : 0;
              return (
                <li key={p.code ?? p.description ?? idx} className="top-products-item" style={{ marginBottom: '12px' }}>
                  <div className="top-products-rank">{idx + 1}</div>
                  <div className="top-products-info">
                    <div className="top-products-name" title={p.description}>
                      {p.description || 'Sin descripción'}
                    </div>
                    <div className="top-products-bar-track">
                      <div
                        className="top-products-bar-fill"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="top-products-meta">
                      <span className="top-products-qty">
                        {Number(p.total_quantity)} {Number(p.total_quantity) === 1 ? 'unidad' : 'unidades'}
                      </span>
                      <span className="top-products-amount">
                        {Helpers.formatCurrency(p.total_amount || 0)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}