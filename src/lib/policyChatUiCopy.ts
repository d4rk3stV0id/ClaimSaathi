import type { Language, Policy } from '../types';

export function policyChatWelcomeMessage(policy: Policy, lang: Language): string {
  switch (lang) {
    case 'hi':
      return `मैंने **${policy.name}** (${policy.insurer}) पढ़ लिया है। अपनी भाषा में सवाल पूछें या नीचे सुझाव टैप करें। जवाब केवल अपलोड की गई फाइल पर आधारित हैं—**दावे की गारंटी नहीं**।`;
    case 'ta':
      return `**${policy.name}** (${policy.insurer}) ஆவணத்தைப் படித்துவிட்டேன். உங்கள் மொழியில் கேளுங்கள். பதில்கள் பதிவேற்றிய கோப்பிலிருந்து மட்டுமே—**கிளைம் உறுதி அல்ல**.`;
    case 'te':
      return `**${policy.name}** (${policy.insurer}) డాక్యుమెంట్ చదివాను. మీ భాషలో అడగండి. సమాధానాలు అప్‌లోడ్ చేసిన ఫైల్ ఆధారంగానే—**క్లెయిం హామీ కాదు**.`;
    case 'bn':
      return `আমি **${policy.name}** (${policy.insurer}) পড়েছি। আপনার ভাষায় প্রশ্ন করুন। উত্তর শুধু আপলোড করা ফাইলের ভিত্তিতে—**ক্লেইমের গ্যারান্টি নয়**।`;
    default:
      return `I've read **${policy.name}** (${policy.insurer}). Ask in your own language, or tap a suggestion below. I answer only from your uploaded file—**not** a claim guarantee.`;
  }
}

export function policyChatSuggestions(lang: Language): string[] {
  switch (lang) {
    case 'hi':
      return ['लासिक कवर है?', 'पुरानी बीमारी पर प्रतीक्षा अवधि?', 'कैशलेस दावा कैसे करें?'];
    case 'ta':
      return ['லேசிக் கவர் உள்ளதா?', 'முன்புணர் நோய்க்கு காத்திருப்பு?', 'கேஷ்லெஸ் கிளைம் எப்படி?'];
    case 'te':
      return ['లాసిక్ కవర్ అవుతుందా?', 'ముందస్తు వ్యాధికి వేచి?', 'క్యాష్‌లెస్ క్లెయిం ఎలా?'];
    case 'bn':
      return ['লাসিক কভার আছে?', 'পূর্ববর্তী অসুখে অপেক্ষার সময়?', 'ক্যাশলেস ক্লেইম কীভাবে?'];
    default:
      return ['Is Lasik covered?', 'Any waiting period for pre-existing disease?', 'How do I make a cashless claim?'];
  }
}

export function policyChatInputPlaceholder(lang: Language, hasDoc: boolean): string {
  if (!hasDoc) {
    switch (lang) {
      case 'hi':
        return 'सवालों के लिए पॉलिस फिर से अपलोड करें';
      case 'ta':
        return 'கேள்விகளுக்கு மீண்டும் பாலிசியை பதிவேற்றவும்';
      case 'te':
        return 'ప్రశ్నలకు పాలసీని మళ్లీ అప్‌లోడ్ చేయండి';
      case 'bn':
        return 'প্রশ্নের জন্য পলিসি আবার আপলোড করুন';
      default:
        return 'Re-upload policy to ask questions';
    }
  }
  switch (lang) {
    case 'hi':
      return 'इस पॉलिसी के बारे में पूछें… (माइक से भी)';
    case 'ta':
      return 'இந்தப் பாலிசி பற்றி கேளுங்கள்… (மைக்)';
    case 'te':
      return 'ఈ పాలసీ గురించి అడగండి… (మైక్)';
    case 'bn':
      return 'এই পলিসি সম্পর্কে জিজ্ঞাসা করুন… (মাইক)';
    default:
      return 'Ask anything about this policy… (or use the mic)';
  }
}
