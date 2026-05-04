# Provider Avatar Upload Contract for Next.js

This project shares Firebase with the Expo app. Provider avatar uploads must use the same contract so the final public image is identical regardless of where it was uploaded.

## Required Flow

1. Let the provider choose an image.
2. Show a square `1:1` crop UI before upload.
3. Export the crop as a square image, ideally `1024x1024` JPG.
4. Upload the cropped file to Firebase Storage under:

```text
providers/{uid}/avatar/{timestamp}-{random}.jpg
```

5. Call the Firebase callable:

```ts
await httpsCallable(functions, 'finalizeProviderAvatarUpload')({ storagePath });
```

6. Use the returned `avatarPath`, or re-read the profile/directory after the callable finishes.

## Do Not

- Do not write `providers/{uid}.professionalProfile.avatarPath` directly from Next.js.
- Do not write `providerDirectory/{uid}.avatarPath` directly.
- Do not assume the uploaded temporary path is the final public path.

## Canonical Result

The callable normalizes the image server-side with `sharp` and writes the final public image to:

```text
providers/{uid}/avatar/profile.jpg
```

The server stores that path in:

```text
providers/{uid}.professionalProfile.avatarPath
```

The existing provider sync trigger publishes it to:

```text
providerDirectory/{uid}.avatarPath
```

Public UI should read `providerDirectory/{uid}.avatarPath`, resolve it with Firebase Storage `getDownloadURL`, and render it with `object-fit: cover` / equivalent centered cover behavior.

## UX Requirements

- Show the exact square crop area before upload.
- Include a small preview for circle avatar and rectangular cards.
- Keep the face/logo centered.
- Keep retry available if upload or finalize fails.
