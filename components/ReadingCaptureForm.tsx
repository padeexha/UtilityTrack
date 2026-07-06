'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import { Scanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, UploadCloud, QrCode, ArrowLeft } from 'lucide-react';

export interface ReadingMeterOption {
  id: string;
  name: string;
  meter_number: string;
  utility_type: string;
  unit: string;
  previous: number;
  building: string;
  site: string;
}

function getCoordinates(): Promise<{ latitude: number | null; longitude: number | null }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

export function ReadingCaptureForm({ meters }: { meters: ReadingMeterOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState<'scan' | 'capture'>('scan');
  const [meterId, setMeterId] = useState(meters[0]?.id ?? '');
  const [currentReading, setCurrentReading] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const selected = useMemo(() => meters.find((meter) => meter.id === meterId), [meterId, meters]);
  const calculated = selected && currentReading !== ''
    ? Math.max(Number(currentReading) - Number(selected.previous), 0)
    : 0;

  async function changePhoto(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : '');

    if (file) {
      setOcrLoading(true);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) {
            scaleSize = MAX_WIDTH / img.width;
          }
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          try {
            const res = await fetch('/api/extract-reading', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: compressedBase64 })
            });
            
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`Server returned ${res.status}: ${text.slice(0, 100)}`);
            }
            
            const data = await res.json();
            if (data.reading) {
              setCurrentReading(data.reading);
            } else {
              setError(data.error || 'AI could not read meter.');
            }
          } catch (err: any) {
            console.error('API Error:', err);
            setError('Failed to extract reading. ' + err.message);
          } finally {
            setOcrLoading(false);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!selected) return setError('Choose a meter.');
    if (!photo) return setError('A clear meter photograph is required.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) return setError('Use a JPG, PNG or WebP photograph.');
    if (photo.size > 6 * 1024 * 1024) return setError('The photograph must be smaller than 6 MB.');

    const numericReading = Number(currentReading);
    if (!Number.isFinite(numericReading) || numericReading < selected.previous) {
      return setError(`Current reading must be ${selected.previous} or higher.`);
    }

    setLoading(true);
    const supabase = createClient();
    let uploadedPath = '';

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Your login session has expired.');

      const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
      uploadedPath = `${user.id}/${selected.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('meter-photos')
        .upload(uploadedPath, photo, { cacheControl: '3600', upsert: false, contentType: photo.type });
      if (uploadError) throw uploadError;

      const coordinates = await getCoordinates();
      const { error: insertError } = await supabase.from('meter_readings').insert({
        meter_id: selected.id,
        current_reading: numericReading,
        status: 'submitted',
        reading_type: 'normal',
        photo_path: uploadedPath,
        notes: notes.trim() || null,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        captured_at: new Date().toISOString(),
        read_by: user.id,
      });

      if (insertError) {
        await supabase.storage.from('meter-photos').remove([uploadedPath]);
        throw insertError;
      }

      router.push('/readings?success=Reading submitted for approval');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit reading.');
    } finally {
      setLoading(false);
    }
  }

  if (meters.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto mt-8 border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center text-destructive">
          No accessible meters are available. Ask an administrator to create or assign a meter.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-lg border-border/50 transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          {step === 'scan' ? <><QrCode className="w-6 h-6" /> Scan Meter QR</> : 'Capture Reading'}
        </CardTitle>
        <CardDescription>
          {step === 'scan' ? 'Scan the QR code on the physical meter to quickly identify it.' : 'Scan or manually enter the latest utility consumption data.'}
        </CardDescription>
      </CardHeader>
      
      {step === 'scan' ? (
        <CardContent className="space-y-6 pt-2">
          <div className="rounded-xl overflow-hidden border-2 border-primary/20 bg-black max-w-sm mx-auto aspect-square relative flex items-center justify-center shadow-inner">
            <Scanner 
              onScan={(result) => {
                if (result && result.length > 0) {
                  const scannedId = result[0].rawValue;
                  // Try to find by UUID or meter_number
                  const found = meters.find(m => m.id === scannedId || m.meter_number === scannedId);
                  if (found) {
                    setMeterId(found.id);
                    setStep('capture');
                    setError('');
                  } else {
                    setError(`Scanned code "${scannedId}" does not match any assigned meter.`);
                  }
                }
              }} 
              onError={(err) => {
                if(err && typeof err === 'object' && 'name' in err && err.name !== 'NotAllowedError' && err.name !== 'NotFoundError'){
                  console.error(err);
                }
              }}

            />
            {/* Overlay corners for visual guidance */}
            <div className="absolute inset-8 border-2 border-white/40 border-dashed rounded-lg pointer-events-none" />
          </div>
          <div className="text-center text-sm font-medium text-muted-foreground max-w-xs mx-auto">
            Point your device camera at the meter's QR code.
          </div>
          
          {error && <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-center">{error}</div>}
          
          <div className="pt-4 flex justify-center">
            <Button variant="outline" type="button" onClick={() => setStep('capture')} className="w-full sm:w-auto">
              Skip & Select Meter Manually
            </Button>
          </div>
        </CardContent>
      ) : (
        <form onSubmit={submit}>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-end gap-2">
              <div className="space-y-2 flex-1">
                <Label htmlFor="meter">Selected Meter</Label>
                <select 
                  id="meter" 
                  value={meterId} 
                  onChange={(event) => setMeterId(event.target.value)} 
                  required
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {meters.map((meter) => (
                    <option key={meter.id} value={meter.id}>
                      {meter.name} — {meter.site} / {meter.building}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="outline" size="icon" type="button" onClick={() => setStep('scan')} title="Back to Scanner" className="shrink-0 h-10 w-10">
                <QrCode className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="text-sm font-medium text-muted-foreground">Previous reading</div>
                <div className="text-2xl font-bold mt-1">{selected?.previous.toLocaleString()} {selected?.unit}</div>
                <div className="text-xs text-muted-foreground mt-2 font-mono">{selected?.meter_number}</div>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm font-medium text-primary">Estimated new consumption</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{calculated.toLocaleString()} {selected?.unit}</div>
                <div className="text-xs text-muted-foreground mt-2">Server applies multiplication factor.</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-reading">Current reading</Label>
              <Input
                id="current-reading"
                type="number"
                inputMode="decimal"
                step="0.0001"
                min={selected?.previous ?? 0}
                value={currentReading}
                onChange={(event) => setCurrentReading(event.target.value)}
                required
                className="text-lg font-semibold h-12"
                placeholder="e.g. 1245.5"
              />
            </div>

            <div className="space-y-2">
              <Label>Take meter photograph</Label>
              <div className="flex flex-col items-center justify-center w-full">
                <label htmlFor="photo" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Tap to take photo</span> or upload</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG or WebP (MAX. 6MB)</p>
                  </div>
                  <input
                    id="photo"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => changePhoto(event.target.files?.[0] ?? null)}
                    required
                  />
                </label>
              </div>
            </div>

            {preview && (
              <div className="relative rounded-lg overflow-hidden border">
                <img className="w-full max-h-64 object-contain bg-black/5" src={preview} alt="Selected meter photograph preview" />
                {ocrLoading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <p className="text-sm font-medium animate-pulse">Scanning image for reading...</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea 
                id="notes" 
                value={notes} 
                onChange={(event) => setNotes(event.target.value)} 
                placeholder="Meter condition, access problem, leak, damaged display, or other observation"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">{error}</div>}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => setStep('scan')} className="h-12 w-12 shrink-0 p-0" title="Back to Scanner">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button type="submit" className="flex-1 text-lg h-12 gap-2 font-bold" disabled={loading}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</> : <><UploadCloud className="w-5 h-5" /> Submit Reading</>}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
