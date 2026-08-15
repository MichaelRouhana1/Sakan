import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { universitiesRepository } from "./universities.repository.js";

export class UniversitiesService {
  list() {
    return universitiesRepository.listAll();
  }

  listInstitutions() {
    return universitiesRepository.listInstitutions();
  }

  async getBySlug(slug: string) {
    const university = await universitiesRepository.findBySlug(slug);
    if (!university) {
      throw new NotFoundError("University not found");
    }
    return university;
  }

  async requireActiveCampus(campusId: string) {
    const campus = await universitiesRepository.findById(campusId);
    if (!campus || !campus.active) {
      throw new ValidationError("Select a valid campus.");
    }
    return campus;
  }
}

export const universitiesService = new UniversitiesService();
