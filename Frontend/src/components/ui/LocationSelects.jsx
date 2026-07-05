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
    setCountries(allCountries);

    // Initialize from names if provided
    if (countryValue) {
      const foundCountry = allCountries.find(c => c.name.toLowerCase() === countryValue.toLowerCase());
      if (foundCountry) {
        setSelectedCountryCode(foundCountry.isoCode);
        const countryStates = State.getStatesOfCountry(foundCountry.isoCode);
        setStates(countryStates);

        if (stateValue) {
          const foundState = countryStates.find(s => s.name.toLowerCase() === stateValue.toLowerCase() || s.isoCode === stateValue);
          if (foundState) {
            setSelectedStateCode(foundState.isoCode);
            setCities(City.getCitiesOfState(foundCountry.isoCode, foundState.isoCode));
          }
        }
      }
    }
  }, []); // Run once on mount or when initializing. 
  // Note: We don't want to re-run this on every prop change to avoid infinite loops,
  // we just want to set the initial ISO codes if the user already had values saved.

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
            {cities.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
