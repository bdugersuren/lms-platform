# 1. Env файлуудыг хуулаад нууц үгнүүдийг тохируулна
cp infra/dmoj/environment/mysql.env.example     infra/dmoj/environment/mysql.env
cp infra/dmoj/environment/mysql-admin.env.example infra/dmoj/environment/mysql-admin.env
cp infra/dmoj/environment/site.env.example      infra/dmoj/environment/site.env
cp .env.dmoj.example .env.dmoj

# 2. LMS stack эхлэх (lms-net үүсгэхийн тулд)
docker compose up -d

# 3. DMOJ stack эхлэх
docker compose -f docker-compose.dmoj.yml --env-file .env.dmoj up -d

# 4. Setup
docker exec dmoj-site python manage.py migrate
docker exec dmoj-site python manage.py collectstatic --no-input
docker exec -it dmoj-site python manage.py createsuperuser
Анхаарах: dmoj/wsevent:latest image Docker Hub-д байхгүй тохиолдолд dmoj-wsevent service-г доош тайлбарласан шиг dmoj/site:latest image + python manage.py runwsgi командаар орлуулж болно.