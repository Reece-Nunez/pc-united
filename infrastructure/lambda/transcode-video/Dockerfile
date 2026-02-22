FROM public.ecr.aws/lambda/nodejs:20

# Install FFmpeg static build
RUN dnf install -y tar xz && \
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ffmpeg.tar.xz && \
    mkdir -p /opt/bin && \
    tar -xf /tmp/ffmpeg.tar.xz -C /tmp && \
    cp /tmp/ffmpeg-*-amd64-static/ffmpeg /opt/bin/ffmpeg && \
    cp /tmp/ffmpeg-*-amd64-static/ffprobe /opt/bin/ffprobe && \
    chmod +x /opt/bin/ffmpeg /opt/bin/ffprobe && \
    rm -rf /tmp/ffmpeg* && \
    dnf clean all

# Copy function code
COPY package.json ${LAMBDA_TASK_ROOT}/
RUN cd ${LAMBDA_TASK_ROOT} && npm install --production

COPY index.mjs ${LAMBDA_TASK_ROOT}/

CMD ["index.handler"]
