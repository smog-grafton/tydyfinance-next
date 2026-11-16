'use client'

import { GoogleMap, InfoWindowF, LoadScript, MarkerF, PolylineF } from '@react-google-maps/api'
import { useRef, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import ComponentContainerCard from '@/components/ComponentContainerCard'

const mapContainerStyle = { width: '100%', height: '100%', position: 'relative' as const }
const defaultCenter = { lat: -12.043333, lng: -77.028333 }
const markerCenter = { lat: 21.569874, lng: 71.5893798 }
const streetViewCenter = { lat: 40.7295174, lng: -73.9986496 }
const polyline = [
  { lat: 37.789411, lng: -122.422116 },
  { lat: 37.785757, lng: -122.421333 },
  { lat: 37.789352, lng: -122.415346 },
]

const MapFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="gmaps" style={{ position: 'relative', overflow: 'hidden' }}>
    {children}
  </div>
)

const DefaultMap = () => (
  <ComponentContainerCard title="Default Map">
    <MapFrame>
      <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={12} />
    </MapFrame>
  </ComponentContainerCard>
)

const MapWithMarkers = () => {
  const [showInfoWindow, setShowInfoWindow] = useState(false)

  return (
    <ComponentContainerCard title="Map With Marker">
      <MapFrame>
        <GoogleMap mapContainerStyle={mapContainerStyle} center={markerCenter} zoom={18}>
          <MarkerF title="This is sweet home." position={markerCenter} onClick={() => alert('You clicked in this marker')} />
          <MarkerF title="Marker with InfoWindow" position={{ lat: 21.56969, lng: 71.5893798 }} onClick={() => setShowInfoWindow(true)} />
          {showInfoWindow && (
            <InfoWindowF position={{ lat: 21.56969, lng: 71.5893798 }} onCloseClick={() => setShowInfoWindow(false)}>
              <p>Current location</p>
            </InfoWindowF>
          )}
        </GoogleMap>
      </MapFrame>
    </ComponentContainerCard>
  )
}

const PolyLineMap = () => (
  <ComponentContainerCard title="Poly Line Map">
    <MapFrame>
      <GoogleMap mapContainerStyle={mapContainerStyle} center={polyline[0]} zoom={14}>
        <PolylineF path={polyline} options={{ strokeColor: '#0000FF', strokeOpacity: 0.8, strokeWeight: 2 }} />
      </GoogleMap>
    </MapFrame>
  </ComponentContainerCard>
)

const LightStyledMap = () => {
  const styles: google.maps.MapTypeStyle[] = [
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e9e9e9' }, { lightness: 17 }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }, { lightness: 20 }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }, { lightness: 17 }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ffffff' }, { lightness: 29 }, { weight: 0.2 }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }, { lightness: 18 }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }, { lightness: 16 }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }, { lightness: 21 }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dedede' }, { lightness: 21 }] },
    { elementType: 'labels.text.stroke', stylers: [{ visibility: 'on' }, { color: '#ffffff' }, { lightness: 16 }] },
    { elementType: 'labels.text.fill', stylers: [{ saturation: 36 }, { color: '#333333' }, { lightness: 40 }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  ]

  return (
    <ComponentContainerCard title="Ultra Light with Labels">
      <MapFrame>
        <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={12} options={{ styles }} />
      </MapFrame>
    </ComponentContainerCard>
  )
}

const StreetViewMap = () => {
  const mapRef = useRef<google.maps.Map | null>(null)

  return (
    <ComponentContainerCard title="Street View Panoramas Google Map">
      <MapFrame>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={streetViewCenter}
          zoom={14}
          onLoad={(map) => {
            mapRef.current = map
            const streetView = map.getStreetView()
            streetView.setPov({ heading: 34, pitch: 10 })
            streetView.setPosition(streetViewCenter)
            streetView.setVisible(true)
          }}
        />
      </MapFrame>
    </ComponentContainerCard>
  )
}

const AllGoogleMaps = () => (
  <LoadScript googleMapsApiKey="AIzaSyDsucrEdmswqYrw0f6ej3bf4M4suDeRgNA">
    <Row className="justify-content-center">
      <Col md={6} lg={6}><DefaultMap /></Col>
      <Col md={6} lg={6}><MapWithMarkers /></Col>
    </Row>
    <Row className="justify-content-center">
      <Col md={6} lg={6}><PolyLineMap /></Col>
      <Col md={6} lg={6}><LightStyledMap /></Col>
    </Row>
    <Row className="justify-content-center">
      <Col xs={12}><StreetViewMap /></Col>
    </Row>
  </LoadScript>
)

export default AllGoogleMaps
