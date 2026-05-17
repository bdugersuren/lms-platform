





Хамгийн тохиромжтой команд:

docker compose --profile core --profile frontend up -d --build
Дараа нь browser дээр:

http://localhost
гэж орж шалгана. Web container өөрөө шууд port expose хийхгүй, nginx 80 портоор дамжуулж өгч байгаа.

Хэрвээ core аль хэдийн асаалттай байгаа бол зөвхөн frontend-г нэмж асаахад:

docker compose --profile core --profile frontend up -d --build web nginx
Статус шалгах:

docker compose ps
Log харах:


docker compose logs -f web nginx gateway





Бүх Prisma schema-тэй service-ийн migration ажиллуулах үндсэн команд:

```
bash scripts/migrate.sh
```

Энэ нь host machine дээрээс pnpm exec prisma migrate deploy-г бүх service дээр ажиллуулна.

Docker container дотор ажиллуулмаар байвал эхлээд шаардлагатай service-үүдээ асаагаад:


```
docker compose --profile core --profile learn --profile finance --profile ops up -d
bash scripts/docker-migrate.sh

```


Зөвхөн core service-үүд дээр migration хийх бол:

```
docker compose --profile core up -d
bash scripts/docker-migrate.sh


```



Бүх service доторх prisma/seed.ts-үүдийг ажиллуулах команд:


```
bash scripts/seed.sh

```

Хэрвээ PostgreSQL Docker дээр ажиллаж байгаа бол илүү тохиромжтой нь:


```
docker compose up -d postgres
bash scripts/docker-seed.sh

```

Бүх service-ийн баазуудыг бүрэн seed хийх урсгал бол:

```
docker compose --profile core --profile learn --profile finance --profile ops up -d
bash scripts/docker-migrate.sh
bash scripts/docker-seed.sh
```

