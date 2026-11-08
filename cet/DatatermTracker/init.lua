-- DatatermTracker 1.0: READ ONLY. Target: game 2.50 / CET 1.38.0.
-- Verified API bodies are in evidence/decompiled/core/systems/fastTravelSystem.script.
-- Does not register nodes, queue requests, change facts, or touch achievements.
local language = 'en'
local labels = {
 en = {ready='Ready. Load a save and click Export.',title='Dataterm Tracker - read only',intro='For Cyberpunk 2.50. Reads registered nodes without changing progress.',export='Export JSON and CSV'},
 es = {ready='Listo. Carga una partida y pulsa Exportar.',title='Dataterm Tracker - solo lectura',intro='Para Cyberpunk 2.50. Solo consulta los nodos registrados; no cambia el progreso.',export='Exportar JSON y CSV'}
}
local M = { status = labels.en.ready, overlay = false }
local function idString(id)
  -- CET v1.38.0 exposes the CRC32 and byte length; <= 40 bits, exact in Lua.
  return string.format('%.0f', id.hash + id.length * 4294967296)
end
local function write(path, value)
  local f, err = io.open(path, 'w')
  if not f then error(err or ('Cannot write ' .. path)) end
  local ok, message = f:write(value)
  local closed, closeError = f:close()
  if not ok or not closed then error(message or closeError or 'File close failed') end
end
local function csv(value)
  local s = tostring(value or '')
  if s:match('^[=+@%-\t\r]') then s = "'" .. s end
  return '"' .. s:gsub('"', '""') .. '"'
end
function M.Export()
  local extraction = {
    schema = 1, game_version = '2.50', source = 'cet', complete = false,
    version_source = 'Exporter target; verify patch 2.50 in the game menu',
    extracted_at = os.date('%Y-%m-%dT%H:%M:%S'), cet_version = GetVersion(),
    points = {}, errors = {}
  }
  local ok, err = pcall(function()
    if not Game.GetPlayer() then error(language=='es' and 'No hay jugador. Carga la partida primero.' or 'No player. Load a save first.') end
    local system = Game.GetScriptableSystemsContainer():Get('FastTravelSystem')
    if not system then error(language=='es' and 'FastTravelSystem no disponible' or 'FastTravelSystem unavailable') end
    local points = system:GetFastTravelPoints()
    if not points then error(language=='es' and 'El getter no devolvio un array' or 'Getter returned no array') end
    extraction.registered_count = #points
    for i, point in ipairs(points) do
      local rowOK, row = pcall(function()
        return {
          id = idString(point:GetPointRecord()),
          marker = tostring(point:GetMarkerRef()),
          is_ep1 = point:IsAnEP1Node(),
          show_on_world_map = point:ShouldShowMappinOnWorldMap(),
          name_key = point:GetPointDisplayName(),
          district_key = point:GetDistrictDisplayName(),
          is_subway = point:IsSubway()
        }
      end)
      if rowOK then table.insert(extraction.points, row)
      else table.insert(extraction.errors, (language=='es' and 'Nodo ' or 'Node ') .. i .. ': ' .. tostring(row)) end
    end
    extraction.engine_achievement_count = system:GetAmmountOfFastTravelPointsOnMap()
    extraction.complete = #extraction.errors == 0 and #extraction.points == #points and #points > 0
  end)
  if not ok then table.insert(extraction.errors, tostring(err)) end
  -- Use the number of serialized rows if a partial export failed, and retain
  -- the API's expected count separately. Partial exports never imply absence.
  extraction.expected_count = extraction.registered_count
  extraction.registered_count = #extraction.points
  local stem = 'dataterms-' .. os.date('%Y%m%d-%H%M%S')
  local saved, saveError = pcall(function()
    local lines = {'id,marker,is_ep1,show_on_world_map,name_key,district_key'}
    for _, p in ipairs(extraction.points) do
      table.insert(lines, table.concat({csv(p.id),csv(p.marker),csv(tostring(p.is_ep1)),csv(tostring(p.show_on_world_map)),csv(p.name_key),csv(p.district_key)}, ','))
    end
    write(stem .. '.json', json.encode(extraction))
    write(stem .. '.csv', '\239\187\191' .. table.concat(lines, '\r\n') .. '\r\n')
  end)
  if saved then
    M.status = string.format(language=='es' and '%d nodos; %d errores. Archivo: %s.json' or '%d nodes; %d errors. File: %s.json', #extraction.points, #extraction.errors, stem)
  else M.status = (language=='es' and 'Error de escritura: ' or 'Write error: ') .. tostring(saveError) end
  print('[DatatermTracker] ' .. M.status)
  return extraction
end
registerForEvent('onOverlayOpen', function() M.overlay = true end)
registerForEvent('onOverlayClose', function() M.overlay = false end)
registerForEvent('onDraw', function()
  if not M.overlay then return end
  ImGui.Begin(labels[language].title)
  if ImGui.Button('English') then language='en'; M.status=labels.en.ready end
  ImGui.SameLine()
  if ImGui.Button('Espanol') then language='es'; M.status=labels.es.ready end
  ImGui.TextWrapped(labels[language].intro)
  if ImGui.Button(labels[language].export) then M.Export() end
  ImGui.TextWrapped(M.status)
  ImGui.End()
end)
return M
