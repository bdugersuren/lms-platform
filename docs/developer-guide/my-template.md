# Engineering Roadmap

| ID | Topic | Priority | Status | Notes |
|---|---|---|---|---|
| ENG-001 | Swagger integration | High | DONE | OpenAPI added |
| ENG-002 | Auth refactor | High | IN_PROGRESS | JWT cleanup |
| ENG-003 | Worker queue | Medium | TODO | BullMQ |



# Төлөвлөх үйлдэл хийх 

Vibe coding prompt -1:

```
We are implementing ENG-004 from docs/roadmap/need.md.

Task:
Build a notification service.

Requirements:

* use existing architecture
* integrate with current docker compose
* add Redis dependency if needed
* update config/system.yml
* ensure docs generation still works
* explain all changes before modifying files

After implementation:

* regenerate generated docs
* update roadmap status
* explain architecture decisions


```


AI юу хийх вэ?

AI:

- code нэмнэ
- compose update хийнэ
- system.yml update хийнэ
- docs regenerate хийнэ
- roadmap status update хийнэ





ТЭГВЭЛ ЧИНИЙ ҮНДСЭН АЖИЛ ЮУ ВЭ?

ЭНЭ ХАМГИЙН ЧУХАЛ.

ЧИ:
❌ documentation writer биш
✅ system designer

Чи:

roadmap бичнэ
architecture decisions гаргана
constraints өгнө
requirements тодорхойлно
AI:
implementation
documentation sync
code generation
refactor
consistency

хийдэг.

Тэгвэл “өөрчлөх шаардлагатай зүйлсээ” хаана бичих вэ?

3 түвшин байна.

LEVEL 1 — Quick ideas
docs/roadmap/ideas.md
Жишээ
- maybe add websocket support
- maybe move auth to separate module
- maybe add feature flags
LEVEL 2 — Planned tasks
docs/roadmap/need.md
Жишээ
| ENG-005 | Websocket gateway | TODO |
LEVEL 3 — Detailed design
docs/architecture/
Example
docs/architecture/websocket-design.md
Тэнд:
why
tradeoffs
flow
diagrams

бичнэ.

AI-ТАЙ ХЭРХЭН АЖИЛЛАХ ВЭ?

ЭНЭ Л VIBE CODING-ийн CORE.

OLD STYLE PROGRAMMING
Human writes code
Human writes docs
Human updates configs
Human updates roadmap
VIBE CODING STYLE
Human defines intent
AI implements system
AI synchronizes docs
AI updates metadata
Human reviews architecture
Тэгвэл AI-д ямар prompt өгөх вэ?
1. Planning prompt

ЭХЛЭЭД.

Analyze the repository and roadmap first.

Read:

docs/roadmap/need.md
config/system.yml
docker-compose.yml

Do not modify files yet.

Explain:

current architecture
missing components
implementation plan
risks
suggested file changes
2. Implementation prompt

Implement ENG-005 from docs/roadmap/need.md.

Requirements:

reuse existing architecture
keep generated docs working
update metadata sources
regenerate documentation
explain every change before applying it
avoid overengineering


3. Refactor prompt

Review the implementation for:

maintainability
duplication
architecture consistency
documentation drift
developer experience

Simplify where possible.

AI-ТАЙ АЖИЛЛАХ АЛТАН ДҮРЭМ
❌ БУРУУ
Build websocket support
✅ ЗӨВ
Implement ENG-005 from roadmap.
Reuse current architecture.
Update generated docs.
Explain all architectural changes first.
ЯАГААД?

Учир нь AI:

context-aware болно
roadmap-aware болно
architecture-aware болно
ХАМГИЙН ТОМ ОЙЛГОЛТ

Чиний repo:

❌ code repository биш
✅ SYSTEM KNOWLEDGE BASE

болно.

Эцсийн architecture
Human Intent
    ↓
Roadmap Docs
    ↓
AI Planning
    ↓
Implementation
    ↓
Metadata Update
    ↓
Generated Docs
    ↓
CI Verification
Нэг өгүүлбэрээр

Чи “гараар documentation бичдэг developer” биш,

“AI-д system evolution удирддаг architect”

болох workflow руу орж байна.