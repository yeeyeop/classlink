'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'

const STATUS_COLORS = {
  free: 0x6ee7b7,
  class: 0xfcd34d,
  reserved: 0x7dd3fc,
  mine: 0x93c5fd,
  maintenance: 0x64748b,
  closed: 0x334155,
}

const STATUS_LABELS = {
  free: '空闲可约',
  class: '上课中',
  reserved: '已被预约',
  mine: '我的预约',
  maintenance: '维护/未投入',
  closed: '不可约',
}

function makeFloorLabel(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(255,255,255,0.88)'
  context.font = '600 48px "Times New Roman", serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(2.2, 0.82, 1)
  return { sprite, texture, material }
}

export default function CampusDigitalTwin({
  rooms,
  selectedRoomId = null,
  onSelectRoom,
  syncedAt,
}) {
  const containerRef = useRef(null)
  const onSelectRef = useRef(onSelectRoom)
  const roomsRef = useRef(rooms)
  const selectedRoomRef = useRef(selectedRoomId)
  const meshesRef = useRef([])
  const [hoveredRoom, setHoveredRoom] = useState(null)

  useEffect(() => {
    onSelectRef.current = onSelectRoom
  }, [onSelectRoom])

  const summary = useMemo(() => {
    return rooms.reduce(
      (accumulator, room) => {
        accumulator[room.status] = (accumulator[room.status] || 0) + 1
        return accumulator
      },
      { free: 0, class: 0, reserved: 0, mine: 0, maintenance: 0, closed: 0 },
    )
  }, [rooms])

  const roomIdsKey = useMemo(
    () => rooms.map((room) => room.id).join('|'),
    [rooms],
  )

  useEffect(() => {
    roomsRef.current = rooms
    selectedRoomRef.current = selectedRoomId
    const roomMap = new Map(rooms.map((room) => [room.id, room]))
    meshesRef.current.forEach((mesh) => {
      const room = roomMap.get(mesh.userData.roomId)
      if (!room) return
      const selected = room.id === selectedRoomId
      const color = STATUS_COLORS[room.status] || STATUS_COLORS.closed
      mesh.userData.room = room
      mesh.userData.selected = selected
      mesh.material.color.setHex(color)
      mesh.material.emissive.setHex(color)
      mesh.material.emissiveIntensity = selected
        ? 1.25
        : room.status === 'free'
          ? 0.38
          : 0.2
      mesh.material.opacity = room.status === 'closed' ? 0.38 : 0.9
      mesh.scale.setScalar(selected ? 1.12 : 1)
      const edges = mesh.userData.edges
      if (edges) {
        edges.material.color.setHex(selected ? 0xffffff : color)
        edges.material.opacity = selected ? 0.95 : 0.38
        edges.scale.copy(mesh.scale)
      }
    })
  }, [rooms, selectedRoomId])

  useEffect(() => {
    const container = containerRef.current
    const currentRooms = roomsRef.current
    if (!container || !currentRooms.length) return undefined

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x05070c, 0.018)
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      180,
    )
    camera.position.set(18, 16, 20)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.target.set(0, 5.4, 0)
    controls.minDistance = 12
    controls.maxDistance = 48
    controls.maxPolarAngle = Math.PI / 2.05

    scene.add(new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 1.4))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1)
    keyLight.position.set(10, 20, 12)
    scene.add(keyLight)

    const floorGroups = new Map()
    const meshes = []
    const disposables = []
    const roomsByFloor = new Map()
    currentRooms.forEach((room) => {
      if (!roomsByFloor.has(room.floor)) roomsByFloor.set(room.floor, [])
      roomsByFloor.get(room.floor).push(room)
    })

    const floors = [...roomsByFloor.keys()].sort((a, b) => a - b)
    floors.forEach((floorNumber, floorIndex) => {
      const floorRooms = roomsByFloor.get(floorNumber)
      const columns = Math.min(6, Math.max(4, Math.ceil(Math.sqrt(floorRooms.length))))
      const rows = Math.ceil(floorRooms.length / columns)
      const floorY = floorIndex * 2.4
      const group = new THREE.Group()
      group.position.y = floorY

      const slabGeometry = new THREE.BoxGeometry(columns * 1.7 + 2.2, 0.18, rows * 1.55 + 2)
      const slabMaterial = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.55,
        roughness: 0.42,
        transparent: true,
        opacity: 0.72,
      })
      const slab = new THREE.Mesh(slabGeometry, slabMaterial)
      slab.position.y = -0.18
      group.add(slab)
      disposables.push(slabGeometry, slabMaterial)

      floorRooms.forEach((room, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)
        const width = 1.35
        const depth = 0.96
        const height = 0.62
        const geometry = new THREE.BoxGeometry(width, height, depth)
        const baseColor = STATUS_COLORS[room.status] || STATUS_COLORS.closed
        const selected = room.id === selectedRoomRef.current
        const material = new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: baseColor,
          emissiveIntensity: selected ? 1.25 : room.status === 'free' ? 0.38 : 0.2,
          transparent: true,
          opacity: room.status === 'closed' ? 0.38 : 0.9,
          metalness: 0.25,
          roughness: 0.35,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(
          (column - (columns - 1) / 2) * 1.7,
          height / 2,
          (row - (rows - 1) / 2) * 1.55,
        )
        mesh.userData = { roomId: room.id, room, selected }
        mesh.scale.setScalar(selected ? 1.12 : 1)
        group.add(mesh)
        meshes.push(mesh)

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          new THREE.LineBasicMaterial({
            color: selected ? 0xffffff : baseColor,
            transparent: true,
            opacity: selected ? 0.95 : 0.38,
          }),
        )
        edges.position.copy(mesh.position)
        edges.scale.copy(mesh.scale)
        mesh.userData.edges = edges
        group.add(edges)
        disposables.push(
          geometry,
          material,
          edges.geometry,
          edges.material,
        )
      })

      const label = makeFloorLabel(`${floorNumber}F`)
      label.sprite.position.set(-columns * 0.85 - 1.45, 0.65, 0)
      group.add(label.sprite)
      disposables.push(label.texture, label.material)

      scene.add(group)
      floorGroups.set(floorNumber, group)
    })
    meshesRef.current = meshes

    const baseGeometry = new THREE.CylinderGeometry(11.5, 13, 0.45, 8)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x07101f,
      metalness: 0.75,
      roughness: 0.36,
      transparent: true,
      opacity: 0.78,
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.position.y = -0.9
    scene.add(base)
    disposables.push(baseGeometry, baseMaterial)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let animationFrame = 0
    let pointerDown = null
    let hoveredId = null

    const setPointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const pickRoom = (event) => {
      setPointer(event)
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(meshes, false)[0]?.object || null
    }

    const handlePointerMove = (event) => {
      const picked = pickRoom(event)
      const nextId = picked?.userData.roomId || null
      renderer.domElement.style.cursor = nextId ? 'pointer' : 'grab'
      if (nextId === hoveredId) return
      meshes.forEach((mesh) => {
        if (mesh.userData.roomId === hoveredId) {
          mesh.scale.setScalar(
            mesh.userData.roomId === selectedRoomRef.current ? 1.12 : 1,
          )
        }
      })
      hoveredId = nextId
      if (picked) {
        picked.scale.setScalar(
          picked.userData.roomId === selectedRoomRef.current ? 1.2 : 1.08,
        )
        setHoveredRoom(picked.userData.room)
      } else {
        setHoveredRoom(null)
      }
    }

    const handlePointerDown = (event) => {
      pointerDown = { x: event.clientX, y: event.clientY }
    }

    const handlePointerUp = (event) => {
      if (!pointerDown) return
      const moved =
        Math.abs(pointerDown.x - event.clientX) +
        Math.abs(pointerDown.y - event.clientY)
      pointerDown = null
      if (moved > 6) return
      const picked = pickRoom(event)
      if (picked) onSelectRef.current?.(picked.userData.room)
    }

    const handlePointerLeave = () => {
      hoveredId = null
      setHoveredRoom(null)
      meshes.forEach((mesh) => {
        mesh.scale.setScalar(
          mesh.userData.roomId === selectedRoomRef.current ? 1.12 : 1,
        )
      })
    }

    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave)

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth
      const height = Math.max(container.clientHeight, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(container)

    const startedAt = performance.now()
    const animate = () => {
      animationFrame = requestAnimationFrame(animate)
      const elapsed = (performance.now() - startedAt) / 1000
      meshes.forEach((mesh, index) => {
        if (mesh.userData.room?.status !== 'free') return
        mesh.material.emissiveIntensity =
          (mesh.userData.selected ? 0.95 : 0.28) +
          (Math.sin(elapsed * 1.8 + index * 0.7) + 1) *
            (mesh.userData.selected ? 0.15 : 0.1)
      })
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
      controls.dispose()
      disposables.forEach((item) => item.dispose?.())
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [roomIdsKey])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#05070c]">
      <div
        ref={containerRef}
        className="h-[430px] w-full sm:h-[520px]"
        aria-label="可交互三维楼宇数字孪生"
      />
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur">
        <p className="text-[10px] tracking-[0.2em] text-white/45">
          DIGITAL TWIN · LIVE DATA
        </p>
        <p className="mt-1 text-xs text-white/75">
          点击任意楼层房间查看详情
        </p>
      </div>
      {hoveredRoom && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-xl border border-white/12 bg-black/80 px-3 py-2 text-xs backdrop-blur">
          <p className="font-medium text-white">
            {hoveredRoom.floor}F · {hoveredRoom.room}
          </p>
          <p className="mt-1 text-white/55">
            {hoveredRoom.type} · {STATUS_LABELS[hoveredRoom.status]}
          </p>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 bg-black/72 px-4 py-3 text-[10px] text-white/55 backdrop-blur">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{
                backgroundColor: `#${STATUS_COLORS[status]
                  .toString(16)
                  .padStart(6, '0')}`,
              }}
            />
            {label} {summary[status] || 0}
          </span>
        ))}
        <span className="ml-auto text-white/35">
          后端同步：
          {syncedAt ? new Date(syncedAt).toLocaleTimeString('zh-CN') : '--'}
        </span>
      </div>
    </div>
  )
}
