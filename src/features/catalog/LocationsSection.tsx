import { MapPin, MessageCircle } from "lucide-react";
import { useId } from "react";

import { buttonClassName, Card } from "@/components/ui";

import { summarizeHours, whatsappLink } from "./format";
import type { PublicLocation } from "./queries";
import styles from "./catalog.module.css";

export function LocationsSection({ locations }: { locations: PublicLocation[] }) {
  if (locations.length === 0) return null;
  return (
    <section aria-labelledby="locales" className={`container ${styles.locations}`}>
      <h2 id="locales">{locations.length === 1 ? "Dónde estamos" : "Nuestros locales"}</h2>
      <div className={styles.locationGrid}>
        {locations.map((location) => (
          <LocationCard key={location.id} location={location} />
        ))}
      </div>
    </section>
  );
}

function LocationCard({ location }: { location: PublicLocation }) {
  const headingId = useId();
  const whatsapp = whatsappLink(location.whatsapp);
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <h3 id={headingId}>{location.name}</h3>
        {location.address && (
          <p className={styles.address}>
            <MapPin aria-hidden="true" className={styles.icon} />
            {location.address}
          </p>
        )}
        <dl className={styles.hours}>
          {summarizeHours(location.location_hours).map(({ days, hours }) => (
            <div key={days} className={styles.hoursRow}>
              <dt>{days}</dt>
              <dd>{hours}</dd>
            </div>
          ))}
        </dl>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName({ variant: "ghost" })}
          >
            <MessageCircle aria-hidden="true" className={styles.icon} />
            Escribir por WhatsApp
          </a>
        )}
      </Card>
    </section>
  );
}
