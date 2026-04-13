<!-- generated: 2026-04-13T05:14:36.571Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Error Catalogue — productcatalogservice

## TL;DR for Agents

- **11 total error codes** defined for `productcatalogservice` in `GoogleCloudPlatform/microservices-demo`.
- **5 errors are retryable** — all in the `upstream` category involving GCP Secret Manager, AlloyDB, or PostgreSQL connectivity.
- **6 errors are non-retryable** — covering local file issues, JSON parsing, schema mismatches, missing products, and unimplemented health checks.
- **Most likely errors during incidents**: `ERR_DATABASE_QUERY_FAILED`, `ERR_PGX_POOL_INIT`, and `ERR_SECRET_ACCESS_FAILED` (upstream dependency failures).
- **If the catalog is empty or products are missing**, investigate `ERR_FILE_NOT_FOUND`, `ERR_INVALID_CATALOG_JSON`, or `ERR_ROW_SCAN_FAILED` — these cause `parseCatalog()` to return an empty product list silently.

## Global Error Handling

The `productcatalogservice` is a gRPC service written in Go that uses the `google.golang.org/grpc/status` package to return structured gRPC status codes. There is **no global error middleware or interceptor**; each RPC method constructs and returns errors directly using `status.Errorf(codes.XXX, message)`. Unimplemented methods (e.g., the health check `Watch()` endpoint) return `codes.Unimplemented`. Catalog loading errors — which occur during startup or catalog refresh in `parseCatalog()` — are logged via `log.Warnf()` but are **not explicitly mapped to gRPC status codes**. When catalog loading fails, the service continues with an empty product list, meaning downstream callers will observe missing data rather than explicit error responses. This makes catalog-loading failures particularly insidious during incident investigation: the service appears healthy but returns no products.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| `ERR_FILE_NOT_FOUND` | — | `other` | ❌ No | Product catalog JSON file (`products.json`) could not be opened | `loadCatalogFromLocalFile()` when `os.ReadFile("products.json")` fails | Ensure `products.json` exists in the service working directory |
| `ERR_INVALID_CATALOG_JSON` | — | `other` | ❌ No | Product catalog JSON failed to parse or unmarshal | `loadCatalogFromLocalFile()` when `jsonpb.Unmarshal()` fails on malformed JSON | Validate `products.json` against the expected protobuf schema |
| `ERR_SECRET_MANAGER_CLIENT_INIT` | — | `upstream` | ✅ Yes | Failed to create Google Cloud Secret Manager client | `getSecretPayload()` when `secretmanager.NewClient()` fails | Verify GCP credentials and Secret Manager API is enabled |
| `ERR_SECRET_ACCESS_FAILED` | — | `upstream` | ✅ Yes | Failed to access secret version from Google Cloud Secret Manager | `getSecretPayload()` when `client.AccessSecretVersion()` fails | Verify secret exists, version is valid, and service account has `secretmanager.secretAccessor` role |
| `ERR_ALLOYDB_DIALER_INIT` | — | `upstream` | ✅ Yes | Failed to initialize AlloyDB connection dialer | `loadCatalogFromAlloyDB()` when `alloydbconn.NewDialer()` fails | Verify GCP credentials and AlloyDB Connector is properly configured |
| `ERR_DSN_PARSE_FAILED` | — | `other` | ❌ No | Failed to parse PostgreSQL DSN configuration | `loadCatalogFromAlloyDB()` when `pgxpool.ParseConfig()` fails | Verify DSN format is valid for the `pgx` driver |
| `ERR_PGX_POOL_INIT` | — | `upstream` | ✅ Yes | Failed to initialize PostgreSQL connection pool | `loadCatalogFromAlloyDB()` when `pgxpool.NewWithConfig()` fails | Verify AlloyDB instance is reachable, credentials are correct, and database exists |
| `ERR_DATABASE_QUERY_FAILED` | — | `upstream` | ✅ Yes | Failed to execute product catalog query against AlloyDB | `loadCatalogFromAlloyDB()` when `pool.Query()` fails | Verify database table exists, schema is correct, and database is accessible |
| `ERR_ROW_SCAN_FAILED` | — | `other` | ❌ No | Failed to scan query result row from database | `loadCatalogFromAlloyDB()` when `rows.Scan()` fails during iteration | Verify database schema matches expected columns and data types |
| `ERR_PRODUCT_NOT_FOUND` | — | `other` | ❌ No | Requested product ID does not exist in catalog | `GetProduct()` gRPC method when product ID is not found in catalog | Verify product ID is correct; use `ListProducts()` to discover available products |
| `ERR_HEALTH_CHECK_WATCH_UNIMPLEMENTED` | — | `other` | ❌ No | Health check `Watch` method is not implemented | `Watch()` gRPC health check method is called | Use `Check()` method for health checks instead of `Watch()` |

> **Note:** This service communicates exclusively over gRPC — no HTTP status codes are mapped. gRPC callers will receive `codes.NotFound` for `ERR_PRODUCT_NOT_FOUND`, `codes.Unimplemented` for `ERR_HEALTH_CHECK_WATCH_UNIMPLEMENTED`, and `codes.Internal` for most other failures.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and runbooks for `productcatalogservice`
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository and deployment documentation
- [gRPC Status Codes Reference](https://grpc.github.io/grpc/core/md_doc_statuscodes.html) — Canonical gRPC status code definitions
- [AlloyDB Connector for Go](https://github.com/GoogleCloudPlatform/alloydb-go-connector) — AlloyDB dialer configuration and troubleshooting