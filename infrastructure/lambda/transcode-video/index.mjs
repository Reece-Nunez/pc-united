import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const s3 = new S3Client({ region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.BUCKET_NAME || 'pc-united';
const REGION = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';

// Supabase client for updating video URLs if extension changes
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const FFMPEG = '/opt/bin/ffmpeg';
const FFPROBE = '/opt/bin/ffprobe';

export const handler = async (event) => {
  const record = event.Records?.[0];
  if (!record) {
    console.log('No records in event, exiting');
    return { statusCode: 200, body: 'No records' };
  }

  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const size = record.s3.object.size;

  console.log(`Processing: ${key} (${(size / 1024 / 1024).toFixed(1)} MB)`);

  // Only process video files in highlights/
  if (!key.startsWith('highlights/')) {
    console.log('Not in highlights/ folder, skipping');
    return { statusCode: 200, body: 'Skipped - wrong folder' };
  }

  const ext = key.split('.').pop()?.toLowerCase();
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'm4v', '3gp'];
  if (!ext || !videoExts.includes(ext)) {
    console.log(`Not a video file (extension: ${ext}), skipping`);
    return { statusCode: 200, body: 'Skipped - not a video' };
  }

  const inputPath = '/tmp/input';
  const outputPath = '/tmp/output.mp4';

  try {
    // Download from S3
    console.log('Downloading from S3...');
    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const response = await s3.send(getCmd);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const inputBuffer = Buffer.concat(chunks);
    writeFileSync(inputPath, inputBuffer);
    console.log(`Downloaded ${(inputBuffer.length / 1024 / 1024).toFixed(1)} MB`);

    // Probe the video codec
    let videoCodec = 'unknown';
    let audioCodec = 'unknown';
    let formatName = 'unknown';
    try {
      videoCodec = execSync(
        `${FFPROBE} -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 ${inputPath}`,
        { encoding: 'utf8', timeout: 30000 }
      ).trim();

      audioCodec = execSync(
        `${FFPROBE} -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 ${inputPath}`,
        { encoding: 'utf8', timeout: 30000 }
      ).trim();

      formatName = execSync(
        `${FFPROBE} -v error -show_entries format=format_name -of csv=p=0 ${inputPath}`,
        { encoding: 'utf8', timeout: 30000 }
      ).trim();

      console.log(`Detected: video=${videoCodec}, audio=${audioCodec}, format=${formatName}`);
    } catch (probeErr) {
      console.log('Probe failed, will attempt transcode:', probeErr.message);
    }

    // Skip if already H.264 + AAC in MP4 container
    if (videoCodec === 'h264' && (formatName.includes('mp4') || formatName.includes('mov'))) {
      console.log('Already H.264 in MP4/MOV container — skipping transcode');

      // Still ensure correct metadata is set
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        if (head.ContentDisposition !== 'inline' || !head.CacheControl) {
          console.log('Updating metadata on existing H.264 file...');
          // Copy object to itself with correct metadata
          const { CopyObjectCommand } = await import('@aws-sdk/client-s3');
          await s3.send(new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `${BUCKET}/${key}`,
            Key: key,
            ContentType: 'video/mp4',
            ContentDisposition: 'inline',
            CacheControl: 'max-age=31536000',
            MetadataDirective: 'REPLACE',
          }));
          console.log('Metadata updated');
        }
      } catch (metaErr) {
        console.log('Metadata check/update failed (non-critical):', metaErr.message);
      }

      cleanup(inputPath, outputPath);
      return { statusCode: 200, body: `Already H.264: ${key}` };
    }

    // Transcode to H.264 + AAC in MP4
    console.log(`Transcoding ${videoCodec} → H.264...`);
    const startTime = Date.now();

    execSync(
      `${FFMPEG} -i ${inputPath} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart -y ${outputPath}`,
      { timeout: 840000, stdio: 'pipe' } // 14 minute timeout
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const transcodedBuffer = readFileSync(outputPath);
    console.log(`Transcode complete in ${elapsed}s — output: ${(transcodedBuffer.length / 1024 / 1024).toFixed(1)} MB`);

    // Determine the output key (ensure .mp4 extension)
    const newKey = key.replace(/\.[^.]+$/, '.mp4');

    // Upload transcoded file to S3
    console.log(`Uploading to S3: ${newKey}`);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: newKey,
      Body: transcodedBuffer,
      ContentType: 'video/mp4',
      ContentDisposition: 'inline',
      CacheControl: 'max-age=31536000',
    }));
    console.log('Upload complete');

    // Update Supabase URL with cache-busting param and handle key changes
    if (supabase) {
      const oldUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
      const cacheBuster = `?v=${Date.now()}`;
      const newUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${newKey}${cacheBuster}`;

      // Match the old URL with or without an existing cache-buster param
      const { data, error } = await supabase
        .from('highlights')
        .select('id, video_url')
        .like('video_url', `%${BUCKET}.s3.${REGION}.amazonaws.com/${key}%`);

      if (error) {
        console.error('Supabase query failed:', error);
      } else if (data && data.length > 0) {
        for (const row of data) {
          const { error: updateErr } = await supabase
            .from('highlights')
            .update({ video_url: newUrl })
            .eq('id', row.id);

          if (updateErr) {
            console.error(`Supabase update failed for id ${row.id}:`, updateErr);
          }
        }
        console.log(`Updated ${data.length} Supabase row(s) with cache-busted URL: ${newUrl}`);
      } else {
        console.log('No matching Supabase rows found for URL update');
      }
    }

    // If the key changed (e.g. .mov → .mp4), delete the original file
    if (newKey !== key) {
      console.log(`Key changed: ${key} -> ${newKey}`);
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        console.log(`Deleted original: ${key}`);
      } catch (delErr) {
        console.error('Failed to delete original:', delErr.message);
      }
    }

    cleanup(inputPath, outputPath);
    console.log(`Done: ${key} → ${newKey} (${videoCodec} → h264, ${elapsed}s)`);
    return { statusCode: 200, body: `Transcoded ${key} → ${newKey}` };

  } catch (err) {
    console.error('Transcode error:', err.message);
    cleanup(inputPath, outputPath);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};

function cleanup(...paths) {
  for (const p of paths) {
    try { unlinkSync(p); } catch {}
  }
}
