import json

def load(path):
    d=json.load(open(path))
    return {
      "dist":[round(x) for x in d['distance']],
      "alt":[round(x,1) for x in d['altitude']],
      "hr":d['heart_rate'],
      "time":d['time'],
    }

rides = [
  dict(load('rides/kralova-hola.json'),
    name="Kráľova hoľa", sub="20 Oct 2024 · 1932 m",
    movingTime=9091, ascent=989,
    intro="From the parking by the dam above Šumiac to the bald summit at <b>1932 m</b> — one climb, "
          "11.8 km long, with not a single metre of flat in it, then the same road back down. "
          "The hardest ride in this set by a wide margin.",
    foot="Kráľova hoľa stands 1946 m in the Low Tatras. Altitude is barometric, which is why the summit reads 1932 m here."),
  dict(load('rides/sliezsky.json'),
    name="Sliezsky dom", sub="29 Aug 2026 · 1668 m",
    movingTime=9961, ascent=946,
    intro="Up to the Sliezsky dom chalet under Gerlach, the second big mountain day here. A gentle 6 km "
          "approach, a short breather, then <b>11 km climbing at 6.1%</b> to 1668 m — and the same road "
          "all the way back down.",
    foot="Sliezsky dom stands at about 1665 m in the High Tatras, below Gerlachovský štít."),
  dict(load('rides/kojsovka.json'),
    name="Kojšovská hoľa", sub="9 Sep 2023 · 1241 m",
    movingTime=19702, ascent=1320,
    intro="The biggest day in this set — 59 km and <b>1320 m</b> of climbing in the Volovské vrchy, "
          "with a climb that runs for 23 km almost without a break. Five and a half hours pedalling, "
          "and over eight hours out.",
    foot="Kojšovská hoľa rises to 1246 m in the Volovské vrchy, south-west of Košice."),
  dict(load('rides/jahodna.json'),
    name="Jahodná", sub="23 Aug 2026 · 627 m",
    movingTime=6231, ascent=577,
    intro="The home loop out of Košice up the Čermeľ valley to Jahodná and back. It climbs in two long, "
          "gentle drags rather than one wall — 32 km with <b>577 m</b> of climbing spread thin, which is "
          "why it rides fast.",
    foot="Jahodná sits at about 630 m above Košice and is the closest proper hill to the city."),
  dict(load('rides/nemcova.json'),
    name="Nemcová Dolka", sub="4 Nov 2023 · 665 m",
    movingTime=10689, ascent=796,
    intro="The longest ride here — 40 km with <b>796 m</b> of climbing, done in three separate efforts "
          "rather than one. It shares the first 8 km with the Jahodná and Hrešná loops before turning off "
          "into different valleys.",
    foot="Nemcová Dolka lies in the hills west of Košice, off the same Čermeľ approach as the other two loops."),
  dict(load('rides/hresna.json'),
    name="Hrešná", sub="27 Jun 2026 · 626 m",
    movingTime=6228, ascent=484,
    intro="The other standing loop from Košice, shorter than Jahodná but with the same shape: a long warm-up "
          "drag, then the real climb to <b>626 m</b>. Almost the same total climbing packed into 8 km fewer.",
    foot="Hrešná is the ridge north-west of Košice, reached from the Čermeľ side."),
]

def arr(a): return "["+",".join(str(x) for x in a)+"]"

parts=[]
for r in rides:
    parts.append("{"
      + 'name:'+json.dumps(r['name'],ensure_ascii=False)+','
      + 'sub:'+json.dumps(r['sub'],ensure_ascii=False)+','
      + 'movingTime:'+str(r['movingTime'])+','
      + 'ascent:'+str(r['ascent'])+',' 
      + 'intro:'+json.dumps(r['intro'],ensure_ascii=False)+','
      + 'foot:'+json.dumps(r['foot'],ensure_ascii=False)+','
      + 'dist:'+arr(r['dist'])+','
      + 'alt:'+arr(r['alt'])+','
      + 'hr:'+arr(r['hr'])+','
      + 'time:'+arr(r['time'])
      + "}")

html = open('template.html').read().replace('/*RIDES*/', "[\n"+",\n".join(parts)+"\n]")
open('slovak-bike-ascents.html','w').write(html)
print("written", len(html))
