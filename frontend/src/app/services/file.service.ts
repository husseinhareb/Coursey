// src/app/services/file.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface UploadResult {
  url: string;   // will now be absolute
}

@Injectable({ providedIn: 'root' })
export class FileService {
  private base = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  /** POST multipart/form-data → { url: string } */
  upload(file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);

    return this.http
      .post<{ url: string }>(`${this.base}/upload`, form)
      .pipe(
        map(res => ({
          // if backend returns `/files/…`, this prefixes your API host:
          url: res.url.startsWith('http')
               ? res.url
               : `${environment.apiUrl}${res.url}`
        }))
      );
  }
}
