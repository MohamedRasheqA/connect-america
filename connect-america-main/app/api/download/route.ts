import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    // Validate URL
    if (!url || !url.includes('connect-america-files.s3')) {
      return new NextResponse('Invalid URL', { status: 400 });
    }

    // Extract bucket and key from the URL
    const urlParts = new URL(url);
    const bucket = urlParts.hostname.split('.')[0];
    const key = urlParts.pathname.substring(1); // Remove leading slash

    try {
      // Method 1: Stream the file directly
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      // Convert the readable stream to a blob
      const chunks = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': response.ContentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${key.split('/').pop()}`,
          'Content-Length': response.ContentLength?.toString() || '',
        },
      });

      // Method 2: Alternative approach using pre-signed URL
      // Uncomment this section if you prefer using pre-signed URLs
      /*
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // URL expires in 1 hour
      });

      return NextResponse.json({ presignedUrl });
      */

    } catch (error) {
      console.error('S3 Error:', error);
      return new NextResponse('Failed to retrieve file from S3', { status: 500 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}