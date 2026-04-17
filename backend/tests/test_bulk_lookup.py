def _item(accession: str, title: str = "t") -> dict:
    return {
        "accession": accession,
        "title": title,
        "source_url": f"https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc={accession}",
    }


def test_lookup_mixed_existing_and_new(client):
    assert client.post("/datasets", json=_item("GSE1", "kept")).status_code == 201
    client.patch("/datasets/GSE1", json={"status": "COLLECTED_COMPLETE", "notes": "done"})

    payload = {
        "items": [
            _item("GSE1", "ignored-on-existing"),
            _item("GSE2", "fresh one"),
            _item("GSE3", "another fresh"),
        ]
    }
    r = client.post("/datasets/lookup", json=payload)
    assert r.status_code == 200
    body = r.json()
    datasets = body["datasets"]

    assert set(datasets.keys()) == {"GSE1", "GSE2", "GSE3"}

    assert datasets["GSE1"]["status"] == "COLLECTED_COMPLETE"
    assert datasets["GSE1"]["title"] == "kept"
    assert datasets["GSE1"]["notes"] == "done"

    assert datasets["GSE2"]["status"] == "NEW"
    assert datasets["GSE2"]["title"] == "fresh one"
    assert datasets["GSE3"]["status"] == "NEW"

    # Verify the new rows were persisted.
    r = client.get("/datasets/GSE2")
    assert r.status_code == 200
    assert r.json()["status"] == "NEW"

    r = client.get("/datasets", params={"status": "NEW"})
    assert r.json()["total"] == 2


def test_lookup_empty_items(client):
    r = client.post("/datasets/lookup", json={"items": []})
    assert r.status_code == 200
    assert r.json() == {"datasets": {}}


def test_lookup_preserves_optional_fields_on_insert(client):
    payload = {
        "items": [
            {
                "accession": "GSE777",
                "title": "t",
                "source_url": "https://x",
                "sample_count": 12,
                "platform": "GPL570",
            }
        ]
    }
    r = client.post("/datasets/lookup", json=payload)
    body = r.json()["datasets"]["GSE777"]
    assert body["sample_count"] == 12
    assert body["platform"] == "GPL570"
    assert body["status"] == "NEW"
