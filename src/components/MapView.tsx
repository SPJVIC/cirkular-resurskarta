import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Circle, LayersControl, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { ArrowRight, BarChart3 } from 'lucide-react';
import type { Facility, Match, MarkerKind } from '../types';
import { CATEGORY_LABELS, COUNTY_BOUNDS, MAP_CENTER, MARKER_COLORS } from '../data/taxonomy';
import { useApp } from '../state/AppContext';
import { markerKind } from '../services/filtering';
import { formatKm } from '../services/distanceCalculator';
import { fmtQty } from '../services/matchingEngine';
import { scoreColor } from './scoreColor';

// ----- Ikoner (cachas så att Leaflet inte bygger om DOM i onödan) -----

const iconCache = new Map<string, L.DivIcon>();
function markerIcon(kind: MarkerKind, opts: { selected: boolean; dimmed: boolean; partner: boolean; secondary: boolean; user: boolean }) {
  const key = `${kind}|${opts.selected}|${opts.dimmed}|${opts.partner}|${opts.secondary}|${opts.user}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const cls = ['crk-marker', opts.selected && 'is-selected', opts.dimmed && 'is-dimmed', opts.partner && 'is-partner', opts.secondary && 'is-secondary']
      .filter(Boolean)
      .join(' ');
    icon = L.divIcon({
      className: '',
      html: `<div class="${cls}" style="--c:${MARKER_COLORS[kind]}">${opts.user ? '<span class="crk-user"></span>' : ''}</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

const draftIcon = L.divIcon({ className: '', html: '<div class="crk-draft"></div>', iconSize: [26, 26], iconAnchor: [13, 13] });

function arrowIcon(angleDeg: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div class="crk-arrow" style="transform: rotate(${angleDeg}deg)"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 4 L20 12 L4 20 L8 12 Z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsgivare';

// ----- Hjälpkomponenter som använder kartinstansen -----

/** Håller kartan i rätt storlek när layouten ändras (paneler öppnas, fönstret ändras). */
function MapResizer({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    let fitted = false;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (!fitted && el.clientWidth > 0 && el.clientHeight > 0) {
        fitted = true;
        map.fitBounds(bounds);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function MapClickHandler() {
  const { editor, setDraft } = useApp();
  const map = useMap();
  useEffect(() => {
    map.getContainer().classList.toggle('is-placing', !!editor);
  }, [editor, map]);
  useMapEvents({
    click(e) {
      if (editor) setDraft({ latitude: round5(e.latlng.lat), longitude: round5(e.latlng.lng) });
    },
  });
  return null;
}

function ViewController({ visibleFacilities, collabFacilities }: { visibleFacilities: Facility[]; collabFacilities: Facility[] | null }) {
  const map = useMap();
  const { filters, selectedActorId, collabActorId, index, focusedMatchId, matches } = useApp();
  const firstRun = useRef(true);
  const filterKey = JSON.stringify(filters);

  // Zooma till filtrerat urval när filtren ändras
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (filters.distance) {
      const d = filters.distance;
      map.fitBounds(L.latLng(d.latitude, d.longitude).toBounds(d.km * 2000), { padding: [30, 30] });
      return;
    }
    if (visibleFacilities.length === 0) return;
    map.fitBounds(L.latLngBounds(visibleFacilities.map((f) => [f.latitude, f.longitude])), { padding: [50, 50], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Zooma till samarbetsnätverket
  useEffect(() => {
    if (!collabFacilities || collabFacilities.length < 2) return;
    const focused = focusedMatchId ? matches.find((m) => m.id === focusedMatchId) : null;
    if (focused) {
      // Fokuserad matchning: lämna plats ovanför för popupen med flödesinformation
      const a = index.facilityById.get(index.resourceById.get(focused.sourceResourceId)?.facilityId ?? '');
      const b = index.facilityById.get(index.needById.get(focused.targetNeedId)?.facilityId ?? '');
      if (a && b) {
        map.fitBounds(L.latLngBounds([a.latitude, a.longitude], [b.latitude, b.longitude]), { paddingTopLeft: [60, 300], paddingBottomRight: [60, 60], maxZoom: 11 });
        return;
      }
    }
    map.fitBounds(L.latLngBounds(collabFacilities.map((f) => [f.latitude, f.longitude])), { paddingTopLeft: [60, 110], paddingBottomRight: [60, 50], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabFacilities?.map((f) => f.id).join(','), focusedMatchId]);

  // Panorera till vald aktör om den ligger utanför vyn (samarbetsläget sköter sin egen zoom)
  useEffect(() => {
    if (!selectedActorId || collabActorId) return;
    const fac = index.facilitiesByActor.get(selectedActorId)?.[0];
    if (!fac) return;
    const ll = L.latLng(fac.latitude, fac.longitude);
    if (!map.getBounds().pad(-0.1).contains(ll)) map.flyTo(ll, Math.max(map.getZoom(), 10), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActorId]);

  return null;
}

// ----- Huvudkomponent -----

export default function MapView({ visibleActorIds, showRejected }: { visibleActorIds: Set<string>; showRejected: boolean }) {
  const { data, index, matches, filters, selectedActorId, selectActor, collabActorId, focusedMatchId, setFocusedMatchId, openAnalysis, editor, draft, setDraft } =
    useApp();

  const collabMatches = useMemo<Match[]>(() => {
    if (!collabActorId || editor) return [];
    return matches.filter(
      (m) => (m.sourceActorId === collabActorId || m.targetActorId === collabActorId) && (showRejected || m.status !== 'rejected'),
    );
  }, [collabActorId, matches, showRejected, editor]);

  const partnerIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of collabMatches) s.add(m.sourceActorId === collabActorId ? m.targetActorId : m.sourceActorId);
    return s;
  }, [collabMatches, collabActorId]);

  // Arbetsstället som redigeras ersätts av en dragbar utkastmarkör
  const editingFacilityId =
    editor?.kind === 'facility-edit'
      ? editor.facilityId
      : editor?.kind === 'actor-edit'
        ? index.facilitiesByActor.get(editor.actorId)?.[0]?.id
        : undefined;

  const shownFacilities = data.facilities.filter(
    (f) => (visibleActorIds.has(f.actorId) || f.actorId === selectedActorId || partnerIds.has(f.actorId)) && f.id !== editingFacilityId,
  );

  const collabFacilities = useMemo(() => {
    if (!collabActorId) return null;
    const ids = new Set<string>();
    for (const m of collabMatches) {
      const r = index.resourceById.get(m.sourceResourceId);
      const n = index.needById.get(m.targetNeedId);
      if (r) ids.add(r.facilityId);
      if (n) ids.add(n.facilityId);
    }
    return [...ids].map((id) => index.facilityById.get(id)).filter((f): f is Facility => !!f);
  }, [collabActorId, collabMatches, index]);

  const bounds = L.latLngBounds([COUNTY_BOUNDS.south, COUNTY_BOUNDS.west], [COUNTY_BOUNDS.north, COUNTY_BOUNDS.east]);

  return (
    <MapContainer center={MAP_CENTER} bounds={bounds} zoomControl className="h-full w-full" minZoom={7} maxZoom={17}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Ljus (nedtonad OpenStreetMap)">
          <TileLayer className="crk-muted-tiles" attribution={OSM_ATTRIBUTION} url={OSM_URL} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap (färg)">
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MapResizer bounds={bounds} />

      <MapClickHandler />

      {filters.distance && (
        <Circle
          center={[filters.distance.latitude, filters.distance.longitude]}
          radius={filters.distance.km * 1000}
          interactive={false}
          pathOptions={{ color: '#7c3aed', weight: 1.5, dashArray: '6 6', fillColor: '#7c3aed', fillOpacity: 0.05 }}
        />
      )}
      <ViewController visibleFacilities={shownFacilities} collabFacilities={collabFacilities} />

      {/* Samarbetslinjer – visas endast för vald aktör */}
      {collabMatches.map((m) => (
        <MatchLine key={m.id} match={m} focused={m.id === focusedMatchId} onFocus={() => setFocusedMatchId(m.id)} onAnalyse={() => openAnalysis(m.id)} />
      ))}

      {shownFacilities.map((f) => {
        const actor = index.actorById.get(f.actorId);
        if (!actor) return null;
        const kind = markerKind(actor.id, index);
        const isSecondary = index.facilitiesByActor.get(actor.id)?.[0]?.id !== f.id;
        const icon = markerIcon(kind, {
          selected: actor.id === selectedActorId,
          dimmed: !!collabActorId && actor.id !== collabActorId && !partnerIds.has(actor.id),
          partner: partnerIds.has(actor.id),
          secondary: isSecondary,
          user: actor.source === 'user',
        });
        return (
          <Marker
            key={f.id}
            position={[f.latitude, f.longitude]}
            icon={icon}
            zIndexOffset={actor.id === selectedActorId ? 1000 : partnerIds.has(actor.id) ? 500 : 0}
            eventHandlers={{
              click: () => {
                if (!editor) selectActor(actor.id);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} className="crk-tooltip">
              {actor.name}
              {isSecondary && <span className="text-slate-400"> · {f.name}</span>}
            </Tooltip>
          </Marker>
        );
      })}

      {editor && draft && (
        <Marker
          position={[draft.latitude, draft.longitude]}
          icon={draftIcon}
          draggable
          zIndexOffset={2000}
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              setDraft({ latitude: round5(ll.lat), longitude: round5(ll.lng) });
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -14]} className="crk-tooltip" permanent>
            Dra för att justera position
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}

function MatchLine({ match, focused, onFocus, onAnalyse }: { match: Match; focused: boolean; onFocus: () => void; onAnalyse: () => void }) {
  const { index } = useApp();
  const resource = index.resourceById.get(match.sourceResourceId);
  const need = index.needById.get(match.targetNeedId);
  const a = resource && index.facilityById.get(resource.facilityId);
  const b = need && index.facilityById.get(need.facilityId);
  const popupRef = useRef<L.Popup>(null);
  const map = useMap();

  useEffect(() => {
    if (focused && popupRef.current && a && b) {
      popupRef.current.setLatLng(midpoint(a, b, 0.5)).openOn(map);
    }
  }, [focused, a, b, map]);

  if (!resource || !need || !a || !b) return null;
  const rejected = match.status === 'rejected';
  const color = scoreColor(match.score, rejected);
  const arrowPos = midpoint(a, b, 0.6);
  const angle = (Math.atan2(-(b.latitude - a.latitude), (b.longitude - a.longitude) * Math.cos((a.latitude * Math.PI) / 180)) * 180) / Math.PI;
  const src = index.actorById.get(match.sourceActorId);
  const tgt = index.actorById.get(match.targetActorId);

  return (
    <>
      <Polyline
        positions={[
          [a.latitude, a.longitude],
          [b.latitude, b.longitude],
        ]}
        pathOptions={{ color, weight: focused ? 6 : 4, opacity: focused ? 1 : 0.8, dashArray: rejected ? '6 8' : undefined, lineCap: 'round' }}
        eventHandlers={{ click: onFocus }}
      >
        <Popup ref={popupRef} minWidth={260} maxWidth={300} autoPanPaddingTopLeft={[20, 90]}>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
              <span className="truncate">{src?.name}</span>
              <ArrowRight size={14} className="shrink-0 text-slate-400" />
              <span className="truncate">{tgt?.name}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs text-slate-600">
              <span className="text-slate-400">Resurs</span>
              <span>
                {CATEGORY_LABELS[resource.category]} – {resource.material}
              </span>
              <span className="text-slate-400">Volym</span>
              <span>{fmtQty(resource.quantity, resource.unit)}</span>
              <span className="text-slate-400">Behov</span>
              <span>{need.material}</span>
              <span className="text-slate-400">Avstånd</span>
              <span>{formatKm(match.distanceKm)} fågelväg</span>
              <span className="text-slate-400">Potential</span>
              <span className="font-semibold" style={{ color }}>
                {match.score}/100 {rejected && '· avvisad'}
              </span>
            </div>
            {rejected ? (
              <p className="text-xs text-red-600">{match.blockers[0]}</p>
            ) : (
              <p className="text-xs text-slate-500">{match.reasons[0]}</p>
            )}
            <button
              type="button"
              onClick={onAnalyse}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <BarChart3 size={14} /> Analysera matchning
            </button>
          </div>
        </Popup>
      </Polyline>
      <Marker position={arrowPos} icon={arrowIcon(angle, color)} interactive={false} />
    </>
  );
}

function midpoint(a: Facility, b: Facility, t: number): [number, number] {
  return [a.latitude + (b.latitude - a.latitude) * t, a.longitude + (b.longitude - a.longitude) * t];
}

function round5(n: number) {
  return Math.round(n * 1e5) / 1e5;
}
