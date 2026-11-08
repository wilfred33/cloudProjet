FROM python:3.9.20-slim

WORKDIR /usr/app

RUN apt-get update -y && apt-get install -y curl

COPY plot.sh ./
COPY plot.py ./
COPY requirements.txt ./

RUN pip install -r requirements.txt

CMD ["bash", "plot.sh"]