export const FIRST_NAMES = [
  'Gloeder','Lantier','Helmar','Brander','Glowin','Lampen','Vlambert','Straalwin','Helderik','Schijndert',
  'Glowa','Helma','Lumea','Glinstra','Lanta','Vlamine','Gloedia','Liora','Glensia','Schijnke',
  'Lumi','Straal','Gloed','Flare','Helden','Glimmer','Lanté','Glint','Lio','Veenla',
  'Glühmar','Lichter','Strahlon','Lampfried','Leuthelm','Flammenhart','Glanzmar','Scheinder','Funktor','Leutger',
  'Glühna','Leutrina','Flammela','Scheina','Lumeris','Strahlinde','Glanzia','Funka','Lamprina','Lichtlena',
  'Lumen','Strahl','Glanz','Schein','Funke','Lumi','Flare','Glimmer','Lio','Leut',
  'Brightram','Glowson','Lumenard','Lantern','Sparksen','Emberic','Lighton','Glewford','Flamden','Lumewell',
  'Glowyne','Emberly','Luminah','Shainy','Brillia','Glissa','Flamara','Glewyn','Liora','Lighta',
  'Shine','Ember','Lux','Lumen','Glow','Bright','Spark','Halo','Nova','Ray',
  'Lumièrel','Éclandon','Flambert','Brillan','Clairot','Glanson','Lantoir','Flambeau','Lumeric','Éclandre',
  'Lumielle','Éclaria','Flamette','Brilline','Clarette','Lantoine','Luminette','Flamise','Éclavie','Glanette',
  'Lumi','Éclan','Flan','Clair','Lume','Lior','Glaisse','Lantel','Bril','Solé'
];

export const LAST_NAMES = [
  'Lampers','Lichtveld','Gloevers','Brandstra','Schijnwater','Lampsma','Glimmerink','Helderkamp','Gloeibergh','Schijnhout',
  'Lantink','Warmstra','Gilderink','Vlamhorst','Gloedeman','Lampveer','Lantaerink','Glowendaal','Lichtman','Vuurveen',
  'Schijnland','Glansbergen','Helderhout','Lijnerink','Branderink','Glinsterink','Lichtgaaf','Lampendaal','Gloeijers','Straalveen',
  'Lampbauer','Lichtweiler','Glanzhoff','Scheinfeld','Glühmann','Flammenberg','Lichtwald','Glimmerhaus','Strahlheim','Lichterloh',
  'Lampbrecht','Glühtaler','Scheinberger','Leuchtner','Lampenkorn','Lichtenthal','Funkenroth','Lampwirth','Glanzhuber','Leuchterling',
  'Lampfried','Flammholz','Lichtendorf','Strahlendorf','Lampinger','Glimmstein','Funkenhart','Lampwitz','Leuchtwald','Scheinbauer',
  'Lampford','Lightwell','Glowstone','Brightfield','Sparksley','Lumenridge','Beaconhill','Glowden','Lightwood','Shinebridge',
  'Emberly','Lampworth','Brightson','Glimmerford','Lighterton','Glowhart','Firewell','Lampstead','Shineridge','Glowlake',
  'Lanternby','Lumenshaw','Brightwall','Sparkfield','Glowingate','Lightmere','Glimwell','Brightridge','Lampstead','Glowshire',
  'Lanterfield','Lamproux','Luminet','Clairvaux','Brilland','Éclairet','Flambeauvin','Glaisson','Brillandeau','Lanterieux',
  'Claretier','Lumièreau','Flammet','Lustrin','Brillonet','Clairoche','Lumevant','Éclardier','Flambert','Lantier',
  'Clairmontin','Glaceau','Lumetier','Brillencourt','Lampourin','Éclavain','Clarisseau','Lustrévin','Brillatier','Lumeveau',
  'Flamotte'
];

export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomName() {
  return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
}
