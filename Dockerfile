# Dockerfile para construir APK de PARKIT
# Uso: docker build -t parkit-builder . && docker run --rm -v $(pwd)/output:/app/output parkit-builder

FROM ubuntu:22.04

# Instalar dependencias
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    wget \
    unzip \
    libzip4 \
    && rm -rf /var/lib/apt/lists/*

# Variables de entorno
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$JAVA_HOME/bin
ENV ANDROID_SDK_ROOT=/opt/android-sdk

# Descargar Android SDK
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools/latest
WORKDIR /opt
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
RUN unzip -q cmdline-tools.zip -d /opt/android/cmdline-tools-temp
RUN mv /opt/android/cmdline-tools-temp/cmdline-tools/* /opt/android-sdk/cmdline-tools/latest/
RUN rm -rf /opt/android /opt/cmdline-tools.zip

# Instalar SDK
ENV PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin
RUN yes | sdkmanager --install "platforms;android-34" "build-tools;34.0.0" "platform-tools"

# Crear estructura de directorios
RUN mkdir -p /workspace/app

WORKDIR /workspace/app

# Copiar código
COPY . /workspace/app/

# Instalar Node.js 20
RUN wget -q https://nodejs.org/dist/v20.19.1/node-v20.19.1-linux-x64.tar.xz -O node.tar.xz
RUN tar -xf node.tar.xz && rm node.tar.xz
ENV PATH=$PATH:/workspace/app/node-v20.19.1-linux-x64/bin

# Build
EXPOSE 5173
WORKDIR /workspace/app
CMD ["npm", "run", "dev"]