import React, { useState, useEffect } from 'react';
import { Country, State, City } from 'country-state-city';
import { Map, MapPin, Compass, Home } from 'lucide-react';
import { locationClient } from '../../utils/apiClient';

export default function LocationSelects({ 
  countryValue, 
  stateValue, 
  cityValue,
  neighborhoodValue,
  onLocationChange,
  disabled = false
}) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // DB Neighborhoods
  const [dbNeighborhoods, setDbNeighborhoods] = useState([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [isCustomNeighborhood, setIsCustomNeighborhood] = useState(false);
  const [customNeighborhoodText, setCustomNeighborhoodText] = useState('');

  // Internal state for ISO codes to make the library work
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('');

  useEffect(() => {
    const allCountries = Country.getAllCountries();
    if (!countries.length) {
      setCountries(allCountries);
    }

    // Sync country
    let currentCountryCode = selectedCountryCode;
    if (countryValue) {
      const foundCountry = allCountries.find(
        c => c.name.toLowerCase() === countryValue.toLowerCase() || 
             c.isoCode.toLowerCase() === countryValue.toLowerCase()
      );
      if (foundCountry && foundCountry.isoCode !== selectedCountryCode) {
        setSelectedCountryCode(foundCountry.isoCode);
        currentCountryCode = foundCountry.isoCode;
        setStates(State.getStatesOfCountry(foundCountry.isoCode));
      } else if (!foundCountry && selectedCountryCode) {
        // If GPS wiped it or sent invalid, we might want to clear
        setSelectedCountryCode('');
        currentCountryCode = '';
        setStates([]);
      }
    } else if (selectedCountryCode) {
      setSelectedCountryCode('');
      currentCountryCode = '';
      setStates([]);
    }

    // Sync state
    let currentStateCode = selectedStateCode;
    if (currentCountryCode && stateValue) {
      const countryStates = State.getStatesOfCountry(currentCountryCode);
      // Try exact match or includes (some APIs return "Antioquia Department" instead of "Antioquia")
      const foundState = countryStates.find(
        s => s.name.toLowerCase() === stateValue.toLowerCase() || 
             s.isoCode.toLowerCase() === stateValue.toLowerCase() ||
             s.name.toLowerCase().includes(stateValue.toLowerCase()) ||
             stateValue.toLowerCase().includes(s.name.toLowerCase())
      );
      if (foundState && foundState.isoCode !== selectedStateCode) {
        setSelectedStateCode(foundState.isoCode);
        currentStateCode = foundState.isoCode;
        setCities(City.getCitiesOfState(currentCountryCode, foundState.isoCode));
      } else if (!foundState && selectedStateCode) {
        setSelectedStateCode('');
        currentStateCode = '';
        setCities([]);
      }
    } else if (selectedStateCode) {
      setSelectedStateCode('');
      currentStateCode = '';
      setCities([]);
    }
    
    // Sync city (City just uses cityValue directly for its value, but we need the list)
    if (currentCountryCode && currentStateCode && !cities.length) {
       setCities(City.getCitiesOfState(currentCountryCode, currentStateCode));
    }
  }, [countryValue, stateValue]); // Re-run when parent values change

  // Sync Neighborhoods whenever cityValue changes
  useEffect(() => {
    let isMounted = true;
    if (cityValue) {
      setLoadingNeighborhoods(true);
      locationClient.getNeighborhoods(cityValue)
        .then(data => {
          if (isMounted) {
            setDbNeighborhoods(data || []);
            // Check if current neighborhoodValue exists in DB or if it's custom
            if (neighborhoodValue) {
              const exists = data.some(n => n.name.toLowerCase() === neighborhoodValue.toLowerCase());
              if (!exists && neighborhoodValue !== 'otro') {
                setIsCustomNeighborhood(true);
                setCustomNeighborhoodText(neighborhoodValue);
              } else {
                setIsCustomNeighborhood(false);
                setCustomNeighborhoodText('');
              }
            } else {
              setIsCustomNeighborhood(false);
              setCustomNeighborhoodText('');
            }
          }
        })
        .catch(err => console.error("Error fetching neighborhoods:", err))
        .finally(() => {
          if (isMounted) setLoadingNeighborhoods(false);
        });
    } else {
      setDbNeighborhoods([]);
      setIsCustomNeighborhood(false);
      setCustomNeighborhoodText('');
    }
    return () => { isMounted = false; };
  }, [cityValue]); // Run only when cityValue changes

  // Also sync neighborhood props externally (e.g. from GPS)
  useEffect(() => {
    if (neighborhoodValue && dbNeighborhoods.length > 0) {
      const exists = dbNeighborhoods.some(n => n.name.toLowerCase() === neighborhoodValue.toLowerCase());
      if (!exists && neighborhoodValue !== 'otro') {
        setIsCustomNeighborhood(true);
        setCustomNeighborhoodText(neighborhoodValue);
      } else if (exists) {
        setIsCustomNeighborhood(false);
        setCustomNeighborhoodText('');
      }
    } else if (!neighborhoodValue) {
      setIsCustomNeighborhood(false);
      setCustomNeighborhoodText('');
    }
  }, [neighborhoodValue]);

  const handleCountryChange = (e) => {
    const countryCode = e.target.value;
    setSelectedCountryCode(countryCode);
    setSelectedStateCode('');
    
    const country = countries.find(c => c.isoCode === countryCode);
    
    // Reset state and city
    setStates(countryCode ? State.getStatesOfCountry(countryCode) : []);
    setCities([]);

    // Bubble up to parent
    onLocationChange({
      country: country ? country.name : '',
      state: '',
      city: '',
      neighborhood: '',
      isNewNeighborhood: false
    });
  };

  const handleStateChange = (e) => {
    const stateCode = e.target.value;
    setSelectedStateCode(stateCode);
    
    const state = states.find(s => s.isoCode === stateCode);
    
    // Reset city
    setCities(stateCode ? City.getCitiesOfState(selectedCountryCode, stateCode) : []);

    onLocationChange({
      country: countryValue,
      state: state ? state.name : '',
      city: '',
      neighborhood: '',
      isNewNeighborhood: false
    });
  };

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    onLocationChange({
      country: countryValue,
      state: stateValue,
      city: cityName,
      neighborhood: '',
      isNewNeighborhood: false
    });
  };

  const handleNeighborhoodChange = (e) => {
    const val = e.target.value;
    if (val === 'otro') {
      setIsCustomNeighborhood(true);
      onLocationChange({
        country: countryValue,
        state: stateValue,
        city: cityValue,
        neighborhood: customNeighborhoodText,
        isNewNeighborhood: true
      });
    } else {
      setIsCustomNeighborhood(false);
      setCustomNeighborhoodText('');
      onLocationChange({
        country: countryValue,
        state: stateValue,
        city: cityValue,
        neighborhood: val,
        isNewNeighborhood: false
      });
    }
  };

  const handleCustomNeighborhoodChange = (e) => {
    const val = e.target.value;
    setCustomNeighborhoodText(val);
    onLocationChange({
      country: countryValue,
      state: stateValue,
      city: cityValue,
      neighborhood: val,
      isNewNeighborhood: true
    });
  };

  return (
    <>
      <div className="profile-field">
        <label htmlFor="countrySelect">País</label>
        <div className="input-with-icon">
          <Map width="18" height="18" />
          <select
            id="countrySelect"
            className="form-select"
            value={selectedCountryCode || ''}
            onChange={handleCountryChange}
            disabled={disabled}
            style={{ paddingLeft: '2.5rem' }}
          >
            <option value="">Selecciona un país</option>
            {countries.map(c => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="profile-field">
        <label htmlFor="stateSelect">Departamento / Estado</label>
        <div className="input-with-icon">
          <Compass width="18" height="18" />
          <select
            id="stateSelect"
            className="form-select"
            value={selectedStateCode || ''}
            onChange={handleStateChange}
            disabled={!selectedCountryCode || disabled}
            style={{ paddingLeft: '2.5rem' }}
          >
            <option value="">Selecciona un estado</option>
            {states.map(s => (
              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="profile-field">
        <label htmlFor="citySelect">Ciudad</label>
        <div className="input-with-icon">
          <MapPin width="18" height="18" />
          <select
            id="citySelect"
            className="form-select"
            value={cityValue || ''}
            onChange={handleCityChange}
            disabled={!selectedStateCode || disabled}
            style={{ paddingLeft: '2.5rem' }}
          >
            <option value="">Selecciona una ciudad</option>
            {cityValue && !cities.some(c => c.name === cityValue) && (
              <option value={cityValue}>{cityValue}</option>
            )}
            {cities.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="profile-field">
        <label htmlFor="neighborhoodSelect">Barrio / Sector</label>
        <div className="input-with-icon">
          <Home width="18" height="18" />
          <select
            id="neighborhoodSelect"
            className="form-select"
            value={isCustomNeighborhood ? 'otro' : (neighborhoodValue || '')}
            onChange={handleNeighborhoodChange}
            disabled={!cityValue || disabled || loadingNeighborhoods}
            style={{ paddingLeft: '2.5rem' }}
          >
            <option value="">
              {loadingNeighborhoods ? 'Cargando barrios...' : 'Selecciona un barrio'}
            </option>
            {dbNeighborhoods.map(n => (
              <option key={n.id} value={n.name}>{n.name}</option>
            ))}
            {/* Si GPS trajo un barrio que no está en dbNeighborhoods y isCustomNeighborhood está false (raro pero posible) */}
            {neighborhoodValue && !isCustomNeighborhood && !dbNeighborhoods.some(n => n.name === neighborhoodValue) && (
              <option value={neighborhoodValue}>{neighborhoodValue}</option>
            )}
            <option value="otro">Otro...</option>
          </select>
        </div>
        
        {isCustomNeighborhood && (
          <div className="mt-3 animate-fade-in input-with-icon">
            <Home width="18" height="18" className="text-tertiary" />
            <input
              type="text"
              className="form-input transition-all duration-300 opacity-100"
              placeholder="Digita el nombre de tu barrio o sector"
              value={customNeighborhoodText}
              onChange={handleCustomNeighborhoodChange}
              disabled={disabled}
              autoFocus
            />
          </div>
        )}
      </div>
    </>
  );
}
