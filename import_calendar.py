import json, sys
from datetime import datetime
from app.db.session import SessionLocal
from app.models.client import Client
from app.models.slot import Slot, SlotStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.provider import Provider

PROVIDER_ID = "6926f3fc-01ad-4c45-87f0-e8afe0c235ab"
JSON_PATH = "/app/import_data/todua_2026_visits.json"

db = SessionLocal()

provider = db.query(Provider).filter(Provider.id == PROVIDER_ID).first()
if not provider:
    print("ERROR: Provider not found"); sys.exit(1)
TENANT_ID = str(provider.tenant_id)
print(f"Provider: {provider.first_name} {provider.last_name}")
print(f"Tenant: {TENANT_ID}")

with open(JSON_PATH, "r", encoding="utf-8") as f:
    visits = json.load(f)
print(f"ვიზიტები: {len(visits)}")

created_clients = 0
created_slots = 0
created_appts = 0
skipped = 0
no_phone_clients = []

for i, v in enumerate(visits):
    try:
        first_name = v["first_name"].strip()
        last_name = v["last_name"].strip()
        phone = v.get("phone", "").strip() or None
        starts_at = datetime.strptime(v["starts_at"], "%Y-%m-%d %H:%M")
        ends_at = datetime.strptime(v["ends_at"], "%Y-%m-%d %H:%M")
        cancelled = v.get("cancelled", False)

        if not first_name:
            skipped += 1
            continue

        # კლიენტი
        client = None
        if phone:
            client = db.query(Client).filter(Client.tenant_id == TENANT_ID, Client.phone == phone).first()
        if not client and first_name and last_name:
            client = db.query(Client).filter(Client.tenant_id == TENANT_ID, Client.first_name == first_name, Client.last_name == last_name).first()
        if not client:
            client = Client(tenant_id=TENANT_ID, first_name=first_name, last_name=last_name, phone=phone)
            db.add(client)
            db.flush()
            created_clients += 1
            if not phone:
                no_phone_clients.append(f"{first_name} {last_name}")

        # სლოტი
        slot = Slot(provider_id=PROVIDER_ID, starts_at=starts_at, ends_at=ends_at, status=SlotStatus.booked if not cancelled else SlotStatus.available)
        db.add(slot)
        db.flush()
        created_slots += 1

        # ჩაწერა
        appt = Appointment(tenant_id=TENANT_ID, client_id=str(client.id), slot_id=str(slot.id), status=AppointmentStatus.cancelled if cancelled else AppointmentStatus.confirmed, notes=v.get("original_summary", ""))
        db.add(appt)
        created_appts += 1

        if (i + 1) % 100 == 0:
            db.commit()
            print(f"  ... {i+1}/{len(visits)}")

    except Exception as e:
        db.rollback()
        print(f"ERROR at {i}: {e}")
        skipped += 1
        continue

db.commit()
db.close()

print(f"\n=== DONE ===")
print(f"კლიენტი შეიქმნა: {created_clients}")
print(f"სლოტი შეიქმნა: {created_slots}")
print(f"ჩაწერა შეიქმნა: {created_appts}")
print(f"გამოტოვებული: {skipped}")

if no_phone_clients:
    print(f"\n=== ტელეფონის გარეშე კლიენტები ({len(no_phone_clients)}) ===")
    for name in sorted(set(no_phone_clients)):
        print(f"  ☎️ {name}")
