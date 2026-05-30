import { AnimationContainer, MaxWidthWrapper } from "@/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BBMP_CONTACT, BBMP_ZONE_CONTACTS } from "@/utils/constants/bbmp-contact";
import { Building2, ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

const HelpPage = () => {
  return (
    <MaxWidthWrapper className="py-20">
      <AnimationContainer delay={0.1} className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-heading">Contact BBMP</h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            For civic complaints and follow-ups with the city corporation, use the official BBMP
            channels below. NammaMarga reports are shared with ward teams; urgent matters can also
            be raised directly with BBMP.
          </p>
        </div>

        <Card className="bg-card/50 border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {BBMP_CONTACT.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ContactRow
              icon={Phone}
              label="Toll-free helpline"
              value={BBMP_CONTACT.helpline}
              href={`tel:${BBMP_CONTACT.helpline}`}
              hint={BBMP_CONTACT.helplineNote}
              highlight
            />
            <ContactRow
              icon={Phone}
              label="Head office"
              value={BBMP_CONTACT.headOfficePhone}
              href={`tel:${BBMP_CONTACT.headOfficePhone.replace(/-/g, "")}`}
            />
            <ContactRow
              icon={MessageCircle}
              label="WhatsApp"
              value={BBMP_CONTACT.whatsapp}
              href={`https://wa.me/91${BBMP_CONTACT.whatsapp}`}
              hint="Share photos of potholes, garbage, or waterlogging"
            />
            <ContactRow
              icon={Mail}
              label="Email"
              value={BBMP_CONTACT.email}
              href={`mailto:${BBMP_CONTACT.email}`}
            />
            <ContactRow
              icon={MapPin}
              label="Head office address"
              value={BBMP_CONTACT.address}
            />
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              <Link
                href={BBMP_CONTACT.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                bbmp.gov.in
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={BBMP_CONTACT.grievancePortal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                {BBMP_CONTACT.grievancePortalLabel}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Zonal control rooms</CardTitle>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              Contact your zone if you need local follow-up after reporting on NammaMarga.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {BBMP_ZONE_CONTACTS.map((z) => (
                <li
                  key={z.zone}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium">{z.zone} zone</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <a href={`tel:${z.phone.replace(/-/g, "")}`} className="hover:text-primary">
                      {z.phone}
                    </a>
                    <a
                      href={`https://wa.me/91${z.whatsapp}`}
                      className="hover:text-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp {z.whatsapp}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </AnimationContainer>
    </MaxWidthWrapper>
  );
};

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  hint,
  highlight,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            className={`text-sm font-medium hover:text-primary hover:underline ${
              highlight ? "text-lg text-foreground" : ""
            }`}
            {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {value}
          </a>
        ) : (
          <p className={`text-sm ${highlight ? "font-medium" : ""}`}>{value}</p>
        )}
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export default HelpPage;
