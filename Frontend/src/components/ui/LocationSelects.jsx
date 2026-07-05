import React, { useState, useEffect } from 'react';
import { Country, State, City } from 'country-state-city';
import { Map, MapPin, Compass } from 'lucide-react';

export default function LocationSelects({ 
  countryValue, 
  stateValue, 
  cityValue, 
  onLocationChange,
  disabled = false
}) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

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
      city: ''
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
      city: ''
    });
  };

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    onLocationChange({
      country: countryValue,
      state: stateValue,
      city: cityName
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
    </>
  );
}
