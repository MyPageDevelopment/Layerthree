# Documentación de la API

Base URL: `http://localhost:3001`

## Autenticación

Todos los endpoints (excepto login) requieren un token JWT en el header:
```
Authorization: Bearer {token}
```

### POST /auth/login
Iniciar sesión

**Request:**
```json
{
  "email": "admin@bodega.com",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@bodega.com",
    "name": "Administrador",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /auth/me
Obtener perfil del usuario autenticado

**Response:**
```json
{
  "id": "uuid",
  "email": "admin@bodega.com",
  "name": "Administrador",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Productos

### GET /products
Listar todos los productos

**Response:**
```json
[
  {
    "id": "uuid",
    "sku": "CABLE-FO-100M",
    "name": "Cable Fibra Óptica 100m",
    "description": "Cable de fibra óptica...",
    "stock": 50,
    "minStock": 10,
    "unitPrice": 15000,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /products/:id
Obtener un producto por ID

**Response:**
```json
{
  "id": "uuid",
  "sku": "CABLE-FO-100M",
  "name": "Cable Fibra Óptica 100m",
  "description": "Cable de fibra óptica...",
  "stock": 50,
  "minStock": 10,
  "unitPrice": 15000,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "movements": [...]
}
```

### GET /products/low-stock
Obtener productos con stock bajo

**Response:** Array de productos donde `stock <= minStock`

### POST /products
Crear un nuevo producto (Solo ADMIN)

**Request:**
```json
{
  "sku": "NEW-SKU-001",
  "name": "Nuevo Producto",
  "description": "Descripción opcional",
  "stock": 100,
  "minStock": 20,
  "unitPrice": 5000
}
```

### PATCH /products/:id
Actualizar un producto (Solo ADMIN)

**Request:**
```json
{
  "stock": 150,
  "minStock": 30
}
```

### DELETE /products/:id
Eliminar un producto (Solo ADMIN)

## Movimientos

### GET /movements
Listar todos los movimientos

**Query params:**
- `limit` (opcional): Número máximo de resultados

**Response:**
```json
[
  {
    "id": "uuid",
    "productId": "uuid",
    "product": {
      "id": "uuid",
      "name": "Cable Fibra Óptica 100m",
      "sku": "CABLE-FO-100M"
    },
    "projectId": "PROJ-2024-001",
    "type": "EXIT",
    "quantity": 5,
    "notes": "Instalación proyecto edificio central",
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "name": "Administrador",
      "email": "admin@bodega.com",
      "role": "ADMIN"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /movements/product/:productId
Obtener movimientos de un producto específico

### GET /movements/project/:projectId
Obtener movimientos de un proyecto específico

### POST /movements
Crear un nuevo movimiento (Solo ADMIN)

**Request:**
```json
{
  "productId": "uuid",
  "projectId": "PROJ-2024-001",
  "type": "EXIT",
  "quantity": 5,
  "notes": "Instalación en edificio central"
}
```

**Tipos de movimiento:**
- `ENTRY`: Entrada de stock
- `EXIT`: Salida de stock

**Validaciones:**
- Para salidas (`EXIT`), verifica que haya stock suficiente
- Actualiza automáticamente el stock del producto

## Códigos de Estado HTTP

- `200`: OK
- `201`: Created
- `400`: Bad Request (datos inválidos)
- `401`: Unauthorized (no autenticado)
- `403`: Forbidden (sin permisos)
- `404`: Not Found (recurso no encontrado)
- `409`: Conflict (ej: SKU duplicado)
- `500`: Internal Server Error

## Ejemplos con cURL

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bodega.com","password":"Admin123!"}'
```

### Listar productos
```bash
curl -X GET http://localhost:3001/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Crear producto
```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sku":"TEST-001",
    "name":"Producto Test",
    "stock":100,
    "minStock":10,
    "unitPrice":1000
  }'
```

### Registrar movimiento
```bash
curl -X POST http://localhost:3001/movements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId":"uuid",
    "type":"EXIT",
    "quantity":5,
    "projectId":"PROJ-2024-001"
  }'
```
