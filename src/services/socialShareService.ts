export interface ShareCardPayload {
  title: string;
  summaryText: string;
  category: 'achievement' | 'diagnosis' | 'forecast' | 'garden';
  imageUrl?: string;
  metrics?: { label: string; value: string | number }[];
}

export class SocialShareService {
  /**
   * Generates formatted text for botanical achievements, diagnoses, or growth forecasts
   */
  public static formatShareText(payload: ShareCardPayload): string {
    const headerMap = {
      achievement: '🌱 BOTANICAL ACHIEVEMENT UNLOCKED',
      diagnosis: '🩺 AI PLANT DIAGNOSIS & HEALTH REPORT',
      forecast: '📈 30-DAY PLANT GROWTH FORECAST',
      garden: '🌿 MY PLANT CARE SANCTUARY PROGRESS',
    };

    const header = headerMap[payload.category] || '🌿 MY PLANT CARE UPDATE';
    let text = `${header}\n\n${payload.title}\n${payload.summaryText}`;

    if (payload.metrics && payload.metrics.length > 0) {
      text += '\n\n📊 Key Metrics:\n';
      payload.metrics.forEach((m) => {
        text += `• ${m.label}: ${m.value}\n`;
      });
    }

    text += '\n#MyPlantCare #UrbanGardening #BotanicalAI #PlantHealth';
    return text;
  }

  /**
   * Triggers native Web Share API with image/file support if available, or falls back to clipboard
   */
  public static async shareCard(payload: ShareCardPayload): Promise<{ success: boolean; method: 'native' | 'clipboard' }> {
    const text = this.formatShareText(payload);
    const url = typeof window !== 'undefined' ? window.location.href : 'https://myplantcare.app';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: text,
          url: url,
        });
        return { success: true, method: 'native' };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, method: 'native' };
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      return { success: true, method: 'clipboard' };
    } catch {
      return { success: false, method: 'clipboard' };
    }
  }

  public static getPlatformShareUrls(payload: ShareCardPayload) {
    const text = encodeURIComponent(this.formatShareText(payload));
    const url = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://myplantcare.app');

    return {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://api.whatsapp.com/send?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      email: `mailto:?subject=${encodeURIComponent(payload.title)}&body=${text}%0A%0A${url}`,
    };
  }
}
