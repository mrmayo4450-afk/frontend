import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ShoppingBag, Shield } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(6, "Password must be at least 6 characters"),
  age: z.coerce.number().min(13, "Must be at least 13 years old").max(120),
  profession: z.string().min(2, "Enter your profession"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotNicFile, setForgotNicFile] = useState<File | null>(null);
  const [forgotNicPreview, setForgotNicPreview] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { email: "", username: "", password: "", age: 18, profession: "" } });

  const onLogin = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid credentials", variant: "destructive" });
    }
  };

  const onForgotPassword = async () => {
    if (!forgotEmail || !forgotPhone || !forgotNicFile) {
      toast({ title: "All fields required", description: "Please provide email, phone number, and NIC image", variant: "destructive" });
      return;
    }
    setForgotSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", forgotNicFile);
      const uploadRes = await fetch("/api/upload/nic", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Failed to upload NIC image");
      const { imageUrl } = await uploadRes.json();
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, phone: forgotPhone, nicImageUrl: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Request Submitted", description: "Please wait for admin approval. Your password will be reset to 123456." });
      setShowForgot(false);
      setForgotEmail(""); setForgotPhone(""); setForgotNicFile(null); setForgotNicPreview("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setForgotSubmitting(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      await register(data);
      navigate("/");
      toast({ title: "Welcome!", description: "Your account has been created successfully." });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message || "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary p-12 text-primary-foreground">
        <div className="flex items-center">
          <BrandLogo size="lg" inverted />
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight mb-4">Build and grow your store with us</h1>
            <p className="text-primary-foreground/70 text-lg">Join thousands of sellers creating their own stores, setting targets, and growing their business on MarketNest.</p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Store, title: "Create Your Store", desc: "Launch your own storefront in minutes" },
              { icon: ShoppingBag, title: "Buy from Any Store", desc: "Discover products from all sellers" },
              { icon: Shield, title: "Admin Support", desc: "24/7 live chat with our admin team" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-primary-foreground/60 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-foreground/50 text-sm">© 2024 MarketNest. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center mb-8 lg:hidden">
            <BrandLogo size="md" />
          </div>

          {showForgot ? (
            <Card>
              <CardHeader>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>Submit your details for password reset. Admin will review your request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="your@email.com" data-testid="input-forgot-email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)} placeholder="Your phone number" data-testid="input-forgot-phone" />
                </div>
                <div className="space-y-2">
                  <Label>NIC / National ID Card Image</Label>
                  <Input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setForgotNicFile(f); setForgotNicPreview(URL.createObjectURL(f)); }}} data-testid="input-forgot-nic" />
                  {forgotNicPreview && <img src={forgotNicPreview} alt="NIC Preview" className="w-full h-32 object-cover rounded-md border" />}
                </div>
                <Button className="w-full" onClick={onForgotPassword} disabled={forgotSubmitting} data-testid="button-submit-forgot">
                  {forgotSubmitting ? "Submitting..." : "Submit Reset Request"}
                </Button>
                <button type="button" onClick={() => setShowForgot(false)} className="text-sm text-muted-foreground hover:underline w-full text-center" data-testid="link-back-to-login">Back to Login</button>
              </CardContent>
            </Card>
          ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Sign in to your MarketNest account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" placeholder="you@example.com" data-testid="input-email" {...loginForm.register("email")} />
                      {loginForm.formState.errors.email && <p className="text-destructive text-sm">{loginForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input id="login-password" type="password" placeholder="••••••••" data-testid="input-password" {...loginForm.register("password")} />
                      {loginForm.formState.errors.password && <p className="text-destructive text-sm">{loginForm.formState.errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-login" disabled={loginForm.formState.isSubmitting}>
                      {loginForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
                    </Button>
                    <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-primary hover:underline w-full text-center" data-testid="link-forgot-password">Forgot Password?</button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Join MarketNest and start selling or buying today</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email</Label>
                        <Input id="reg-email" type="email" placeholder="you@example.com" data-testid="input-reg-email" {...registerForm.register("email")} />
                        {registerForm.formState.errors.email && <p className="text-destructive text-sm">{registerForm.formState.errors.email.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-username">Username</Label>
                        <Input id="reg-username" placeholder="yourname" data-testid="input-reg-username" {...registerForm.register("username")} />
                        {registerForm.formState.errors.username && <p className="text-destructive text-sm">{registerForm.formState.errors.username.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input id="reg-password" type="password" placeholder="••••••••" data-testid="input-reg-password" {...registerForm.register("password")} />
                      {registerForm.formState.errors.password && <p className="text-destructive text-sm">{registerForm.formState.errors.password.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-age">Age</Label>
                        <Input id="reg-age" type="number" placeholder="25" data-testid="input-reg-age" {...registerForm.register("age")} />
                        {registerForm.formState.errors.age && <p className="text-destructive text-sm">{registerForm.formState.errors.age.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-profession">Profession</Label>
                        <Input id="reg-profession" placeholder="Engineer, Designer..." data-testid="input-reg-profession" {...registerForm.register("profession")} />
                        {registerForm.formState.errors.profession && <p className="text-destructive text-sm">{registerForm.formState.errors.profession.message}</p>}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-register" disabled={registerForm.formState.isSubmitting}>
                      {registerForm.formState.isSubmitting ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
