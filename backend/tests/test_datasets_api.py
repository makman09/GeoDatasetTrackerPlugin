import time
from datetime import datetime


def _make(accession: str = "GSE1", title: str = "hello world") -> dict:
    return {
        "accession": accession,
        "title": title,
        "source_url": f"https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc={accession}",
    }


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_create_get_delete(client):
    r = client.post("/datasets", json=_make("GSE100"))
    assert r.status_code == 201
    body = r.json()
    assert body["accession"] == "GSE100"
    assert body["status"] == "NEW"

    r = client.get("/datasets/GSE100")
    assert r.status_code == 200
    assert r.json()["title"] == "hello world"

    r = client.delete("/datasets/GSE100")
    assert r.status_code == 204

    r = client.get("/datasets/GSE100")
    assert r.status_code == 404


def test_create_duplicate_is_409(client):
    assert client.post("/datasets", json=_make("GSE200")).status_code == 201
    r = client.post("/datasets", json=_make("GSE200"))
    assert r.status_code == 409


def test_get_missing_is_404(client):
    r = client.get("/datasets/GSE_DOES_NOT_EXIST")
    assert r.status_code == 404


def test_patch_missing_is_404(client):
    r = client.patch("/datasets/GSE_NONE", json={"status": "COLLECTED_TODO"})
    assert r.status_code == 404


def test_patch_updates_fields_and_timestamp(client):
    assert client.post("/datasets", json=_make("GSE300", "orig")).status_code == 201
    first = client.get("/datasets/GSE300").json()
    original_updated = first["updated_at"]

    time.sleep(0.01)
    r = client.patch(
        "/datasets/GSE300",
        json={"status": "REJECTED_COMPLEX", "reason": "too many cell lines", "notes": "n"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "REJECTED_COMPLEX"
    assert body["reason"] == "too many cell lines"
    assert body["notes"] == "n"
    assert body["updated_at"] != original_updated
    assert datetime.fromisoformat(body["updated_at"]) > datetime.fromisoformat(original_updated)


def test_list_filter_by_status_and_query(client):
    client.post("/datasets", json=_make("GSE401", "asthma atlas"))
    client.post("/datasets", json=_make("GSE402", "eosinophilic study"))
    client.post("/datasets", json=_make("GSE403", "colitis dataset"))
    client.patch("/datasets/GSE402", json={"status": "COLLECTED_TODO"})

    r = client.get("/datasets", params={"status": "COLLECTED_TODO"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["accession"] == "GSE402"

    r = client.get("/datasets", params={"q": "asthma"})
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["accession"] == "GSE401"

    r = client.get("/datasets")
    assert r.json()["total"] == 3


def test_list_pagination(client):
    for i in range(5):
        client.post("/datasets", json=_make(f"GSE50{i}", f"title {i}"))
    r = client.get("/datasets", params={"limit": 2, "offset": 0})
    body = r.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2
