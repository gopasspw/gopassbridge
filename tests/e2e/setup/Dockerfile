FROM mcr.microsoft.com/playwright:v1.57.0-noble

RUN wget -O /usr/share/keyrings/gopass-archive-keyring.gpg https://packages.gopass.pw/repos/gopass/gopass-archive-keyring.gpg

COPY tests/e2e/setup/gopass.sources /etc/apt/sources.list.d/gopass.sources

RUN apt update && \
    apt install -y gopass gopass-jsonapi jq gnupg

WORKDIR /workspace

CMD ["tests/e2e/setup/exec_test_setup.sh"]
