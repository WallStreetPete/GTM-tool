import type { Lead } from "./types";

export const SAMPLE_COLUMNS = [
  "First Name",
  "Last Name",
  "Title",
  "Company",
  "Email",
  "LinkedIn",
  "Location",
  "Website",
];

type Row = {
  first: string;
  last: string;
  title: string;
  company: string;
  email: string;
  linkedin: string;
  location: string;
  website: string;
};

const ROWS: Row[] = [
  { first: "Maya", last: "Chen", title: "VP of Sales", company: "Northwind Labs", email: "maya.chen@northwindlabs.com", linkedin: "https://linkedin.com/in/mayachen", location: "Austin, TX", website: "northwindlabs.com" },
  { first: "Daniel", last: "Okafor", title: "Founder & CEO", company: "Cadence Fintech", email: "daniel@cadence.io", linkedin: "https://linkedin.com/in/danielokafor", location: "New York, NY", website: "cadence.io" },
  { first: "Priya", last: "Raman", title: "Head of Growth", company: "Lumen Health", email: "priya.raman@lumenhealth.com", linkedin: "https://linkedin.com/in/priyaraman", location: "Boston, MA", website: "lumenhealth.com" },
  { first: "Marcus", last: "Webb", title: "Director of RevOps", company: "Trailhead Commerce", email: "mwebb@trailhead.com", linkedin: "https://linkedin.com/in/marcuswebb", location: "Denver, CO", website: "trailhead.com" },
  { first: "Sofia", last: "Alvarez", title: "CTO", company: "Quill AI", email: "sofia@quill.ai", linkedin: "https://linkedin.com/in/sofiaalvarez", location: "San Francisco, CA", website: "quill.ai" },
  { first: "James", last: "Patel", title: "VP Marketing", company: "Beacon Logistics", email: "james.patel@beaconlogistics.com", linkedin: "https://linkedin.com/in/jamespatel", location: "Chicago, IL", website: "beaconlogistics.com" },
  { first: "Hannah", last: "Kim", title: "Founder", company: "Orchard Studio", email: "hannah@orchard.studio", linkedin: "https://linkedin.com/in/hannahkim", location: "Seattle, WA", website: "orchard.studio" },
  { first: "Tobias", last: "Mueller", title: "Head of Engineering", company: "Forge Robotics", email: "tobias@forgerobotics.com", linkedin: "https://linkedin.com/in/tobiasmueller", location: "Pittsburgh, PA", website: "forgerobotics.com" },
];

export function loadSample(): { leads: Lead[]; columns: string[] } {
  const leads: Lead[] = ROWS.map((r) => ({
    id: crypto.randomUUID(),
    firstName: r.first,
    lastName: r.last,
    fullName: `${r.first} ${r.last}`,
    title: r.title,
    company: r.company,
    email: r.email,
    linkedin: r.linkedin,
    location: r.location,
    website: r.website,
    status: "pending",
    raw: {
      "First Name": r.first,
      "Last Name": r.last,
      Title: r.title,
      Company: r.company,
      Email: r.email,
      LinkedIn: r.linkedin,
      Location: r.location,
      Website: r.website,
    },
  }));
  return { leads, columns: SAMPLE_COLUMNS };
}
