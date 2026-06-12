async function findOrCreateFolder(accessToken: string) {
  const folderName = "KP_Logbook_Microdata";
  
  // Search for folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  
  const searchData: any = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create if not found
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  const folder: any = await createRes.json();
  return folder.id;
}

export async function uploadFileToGDrive(file: File, accessToken: string, date: string, index: number) {
  const folderId = await findOrCreateFolder(accessToken);
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
  const customName = `KP_${date}_${String(index).padStart(3, '0')}${ext}`;

  const metadata = {
    name: customName,
    mimeType: file.type,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink,mimeType",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to Google Drive: ${error}`);
  }

  const uploadResult: any = await response.json();

  // Set permission to anyone with link can view
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${uploadResult.id}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    }
  );

  return uploadResult;
}

export async function deleteFileFromGDrive(fileId: string, accessToken: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("Failed to delete from GDrive:", await response.text());
  }
}

