import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

function shouldServeInline(contentType: string): boolean {
  return (contentType.startsWith('image/') && contentType !== 'image/svg+xml')
    || contentType.startsWith('video/')
    || contentType.startsWith('audio/');
}

export async function generatePresignedUploadUrl(fileName: string, contentType: string, isPublic = false) {
  const s3 = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  const prefix = isPublic ? `${folderPrefix}public/uploads` : `${folderPrefix}uploads`;
  const safeName = fileName.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  const cloud_storage_path = `${prefix}/${Date.now()}-${safeName}`;
  const command = new PutObjectCommand({ Bucket: bucketName, Key: cloud_storage_path, ContentType: contentType, ...(isPublic ? { ACL: 'public-read' } : {}) });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const encodedPath = cloud_storage_path.split('/').map(encodeURIComponent).join('/');
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const endpoint = process.env.AWS_ENDPOINT;
  const publicUrl = isPublic
    ? (endpoint
        ? `https://${bucketName}.${region}.digitaloceanspaces.com/${encodedPath}`
        : `https://${bucketName}.s3.${region}.amazonaws.com/${encodedPath}`)
    : undefined;
  const headers = isPublic ? { 'x-amz-acl': 'public-read' } : undefined;
  return { uploadUrl, cloud_storage_path, ...(publicUrl ? { publicUrl } : {}), ...(headers ? { headers } : {}) };
}

export async function getFileUrl(cloud_storage_path: string, contentType: string, isPublic: boolean) {
  const { bucketName } = getBucketConfig();
  if (isPublic) {
    const region = process.env.AWS_REGION ?? 'us-east-1';
    const endpoint = process.env.AWS_ENDPOINT;
    const encodedPath = cloud_storage_path.split('/').map(encodeURIComponent).join('/');
    if (endpoint) {
      return `https://${bucketName}.${region}.digitaloceanspaces.com/${encodedPath}`;
    }
    return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedPath}`;
  }
  const s3 = createS3Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: shouldServeInline(contentType) ? 'inline' : 'attachment',
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path }));
}

export async function initiateMultipartUpload(fileName: string, contentType: string, isPublic: boolean) {
  const s3 = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  const prefix = isPublic ? `${folderPrefix}public/uploads` : `${folderPrefix}uploads`;
  const safeName = fileName.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  const cloud_storage_path = `${prefix}/${Date.now()}-${safeName}`;
  const command = new CreateMultipartUploadCommand({ Bucket: bucketName, Key: cloud_storage_path, ContentType: contentType });
  const response = await s3.send(command);
  return { uploadId: response.UploadId, cloud_storage_path };
}

export async function getPresignedUrlForPart(cloud_storage_path: string, uploadId: string, partNumber: number) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  const command = new UploadPartCommand({ Bucket: bucketName, Key: cloud_storage_path, UploadId: uploadId, PartNumber: partNumber });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function completeMultipartUpload(cloud_storage_path: string, uploadId: string, parts: Array<{ ETag: string; PartNumber: number }>) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  await s3.send(new CompleteMultipartUploadCommand({ Bucket: bucketName, Key: cloud_storage_path, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
}
